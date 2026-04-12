export class InvalidProxyConfig extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProxyConfig';
  }
}

export abstract class ProxyConfig {
  abstract get httpUrl(): string | undefined;
  abstract get httpsUrl(): string | undefined;

  get preventKeepingConnectionsAlive(): boolean {
    return false;
  }

  get retriesWhenBlocked(): number {
    return 0;
  }
}
