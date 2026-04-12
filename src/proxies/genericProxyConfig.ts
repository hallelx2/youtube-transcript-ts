import { InvalidProxyConfig, ProxyConfig } from './proxyConfig.js';

export interface GenericProxyConfigOptions {
  httpUrl?: string;
  httpsUrl?: string;
}

export class GenericProxyConfig extends ProxyConfig {
  protected readonly _httpUrl?: string;
  protected readonly _httpsUrl?: string;

  constructor(options: GenericProxyConfigOptions = {}) {
    super();
    const { httpUrl, httpsUrl } = options;
    if (!httpUrl && !httpsUrl) {
      throw new InvalidProxyConfig(
        'GenericProxyConfig requires you to define at least one of the two: ' +
          'http or https',
      );
    }
    this._httpUrl = httpUrl;
    this._httpsUrl = httpsUrl;
  }

  override get httpUrl(): string | undefined {
    return this._httpUrl ?? this._httpsUrl;
  }

  override get httpsUrl(): string | undefined {
    return this._httpsUrl ?? this._httpUrl;
  }
}
