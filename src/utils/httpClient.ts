import type { ProxyConfig } from '../proxies/proxyConfig.js';

export type FetchFn = typeof fetch;

export interface HttpClientOptions {
  proxyConfig?: ProxyConfig;
  fetchFn?: FetchFn;
}

function isBun(): boolean {
  return typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined';
}

function isDeno(): boolean {
  return typeof (globalThis as { Deno?: unknown }).Deno !== 'undefined';
}

interface CookieJar {
  // domain (with or without leading dot) -> name -> value
  get(host: string): string | undefined;
  set(name: string, value: string, domain: string): void;
}

function createCookieJar(): CookieJar {
  const store = new Map<string, Map<string, string>>();
  return {
    set(name, value, domain) {
      const key = domain.startsWith('.') ? domain : `.${domain}`;
      let inner = store.get(key);
      if (!inner) {
        inner = new Map();
        store.set(key, inner);
      }
      inner.set(name, value);
    },
    get(host) {
      // Suffix-match host against each stored domain.
      const parts: string[] = [];
      for (const [domain, cookies] of store) {
        const bare = domain.startsWith('.') ? domain.slice(1) : domain;
        if (host === bare || host.endsWith(`.${bare}`)) {
          for (const [name, value] of cookies) {
            parts.push(`${name}=${value}`);
          }
        }
      }
      return parts.length > 0 ? parts.join('; ') : undefined;
    },
  };
}

export class HttpClient {
  private readonly _proxyConfig?: ProxyConfig;
  private readonly _userFetch?: FetchFn;
  private readonly _cookies = createCookieJar();
  private _undiciDispatcher: unknown = null;
  private _undiciLoaded = false;

  constructor(options: HttpClientOptions = {}) {
    this._proxyConfig = options.proxyConfig;
    this._userFetch = options.fetchFn;
    if (this._proxyConfig && !this._userFetch && isDeno()) {
      throw new Error(
        'Proxy support on Deno requires a custom fetchFn. Pass `fetchFn` ' +
          'configured with `Deno.createHttpClient` to YouTubeTranscriptApi.',
      );
    }
  }

  setCookie(name: string, value: string, domain: string): void {
    this._cookies.set(name, value, domain);
  }

  async get(url: string): Promise<Response> {
    return this._fetch(url, { method: 'GET' });
  }

  async post(url: string, jsonBody: unknown): Promise<Response> {
    return this._fetch(url, {
      method: 'POST',
      body: JSON.stringify(jsonBody),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async _fetch(url: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    if (!headers.has('Accept-Language')) {
      headers.set('Accept-Language', 'en-US');
    }
    if (this._proxyConfig?.preventKeepingConnectionsAlive) {
      headers.set('Connection', 'close');
    }
    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      host = '';
    }
    if (host) {
      const cookieHeader = this._cookies.get(host);
      if (cookieHeader) {
        headers.set('Cookie', cookieHeader);
      }
    }

    const finalInit: RequestInit = { ...init, headers };

    if (this._userFetch) {
      return this._userFetch(url, finalInit);
    }

    if (this._proxyConfig) {
      const proxyUrl = url.startsWith('https:')
        ? this._proxyConfig.httpsUrl
        : this._proxyConfig.httpUrl;
      if (proxyUrl) {
        if (isBun()) {
          const bunRef = (globalThis as { Bun?: { fetch: FetchFn } }).Bun;
          if (bunRef) {
            return bunRef.fetch(url, {
              ...finalInit,
              // Bun-specific option
              proxy: proxyUrl,
            } as RequestInit & { proxy: string });
          }
        }
        // Node path: lazy-load undici and create a ProxyAgent dispatcher.
        const dispatcher = await this._getUndiciDispatcher(proxyUrl);
        return fetch(url, {
          ...finalInit,
          dispatcher,
        } as RequestInit & { dispatcher: unknown });
      }
    }

    return fetch(url, finalInit);
  }

  private async _getUndiciDispatcher(proxyUrl: string): Promise<unknown> {
    if (this._undiciLoaded && this._undiciDispatcher) {
      return this._undiciDispatcher;
    }
    try {
      const undici = (await import('undici')) as {
        ProxyAgent: new (options: { uri: string }) => unknown;
      };
      this._undiciDispatcher = new undici.ProxyAgent({ uri: proxyUrl });
      this._undiciLoaded = true;
      return this._undiciDispatcher;
    } catch (err) {
      throw new Error(
        'Proxy support on Node.js requires the optional peer dependency ' +
          '`undici`. Install it with `npm install undici`, or pass a custom ' +
          '`fetchFn` to YouTubeTranscriptApi. Original error: ' +
          String(err),
      );
    }
  }
}

// Re-export so that downstream code does not import the type-only `Bun`/`Deno`
// stubs from this file.
export { isBun as _isBun, isDeno as _isDeno };
