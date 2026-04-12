import { GenericProxyConfig } from './genericProxyConfig.js';

export interface WebshareProxyConfigOptions {
  proxyUsername: string;
  proxyPassword: string;
  filterIpLocations?: string[];
  retriesWhenBlocked?: number;
  domainName?: string;
  proxyPort?: number;
}

const DEFAULT_DOMAIN_NAME = 'p.webshare.io';
const DEFAULT_PORT = 80;
const ROTATE_SUFFIX = '-rotate';

export class WebshareProxyConfig extends GenericProxyConfig {
  readonly proxyUsername: string;
  readonly proxyPassword: string;
  readonly domainName: string;
  readonly proxyPort: number;
  private readonly _filterIpLocations: string[];
  private readonly _retriesWhenBlocked: number;

  constructor(options: WebshareProxyConfigOptions) {
    // Bypass GenericProxyConfig's URL requirement check by providing a placeholder.
    super({ httpUrl: 'placeholder' });
    this.proxyUsername = options.proxyUsername;
    this.proxyPassword = options.proxyPassword;
    this.domainName = options.domainName ?? DEFAULT_DOMAIN_NAME;
    this.proxyPort = options.proxyPort ?? DEFAULT_PORT;
    this._filterIpLocations = options.filterIpLocations ?? [];
    this._retriesWhenBlocked = options.retriesWhenBlocked ?? 10;
  }

  get url(): string {
    const locationCodes = this._filterIpLocations
      .map((code) => `-${code.toUpperCase()}`)
      .join('');
    let username = this.proxyUsername;
    if (username.endsWith(ROTATE_SUFFIX)) {
      username = username.slice(0, -ROTATE_SUFFIX.length);
    }
    const encodedUser = encodeURIComponent(username);
    const encodedPass = encodeURIComponent(this.proxyPassword);
    return (
      `http://${encodedUser}${locationCodes}${ROTATE_SUFFIX}:${encodedPass}` +
      `@${this.domainName}:${this.proxyPort}/`
    );
  }

  override get httpUrl(): string {
    return this.url;
  }

  override get httpsUrl(): string {
    return this.url;
  }

  override get preventKeepingConnectionsAlive(): boolean {
    return true;
  }

  override get retriesWhenBlocked(): number {
    return this._retriesWhenBlocked;
  }
}
