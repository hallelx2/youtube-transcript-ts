import { describe, expect, it } from 'vitest';
import { GenericProxyConfig } from '../src/proxies/genericProxyConfig.js';
import { InvalidProxyConfig } from '../src/proxies/proxyConfig.js';
import { WebshareProxyConfig } from '../src/proxies/webshareProxyConfig.js';

describe('GenericProxyConfig', () => {
  it('throws when both URLs are missing', () => {
    expect(() => new GenericProxyConfig({})).toThrow(InvalidProxyConfig);
  });

  it('mutually defaults http and https URLs', () => {
    const a = new GenericProxyConfig({ httpUrl: 'http://x:8080' });
    expect(a.httpUrl).toBe('http://x:8080');
    expect(a.httpsUrl).toBe('http://x:8080');

    const b = new GenericProxyConfig({ httpsUrl: 'https://y:8443' });
    expect(b.httpUrl).toBe('https://y:8443');
    expect(b.httpsUrl).toBe('https://y:8443');
  });
});

describe('WebshareProxyConfig', () => {
  it('builds the default rotating URL', () => {
    const cfg = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
    });
    expect(cfg.url).toBe('http://user-rotate:pass@p.webshare.io:80/');
    expect(cfg.httpUrl).toBe(cfg.url);
    expect(cfg.httpsUrl).toBe(cfg.url);
  });

  it('does not double-suffix -rotate when username already has it', () => {
    const cfg = new WebshareProxyConfig({
      proxyUsername: 'user-rotate',
      proxyPassword: 'pass',
    });
    expect(cfg.url).toBe('http://user-rotate:pass@p.webshare.io:80/');
  });

  it('appends location codes in upper case', () => {
    const cfg = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
      filterIpLocations: ['us', 'de'],
    });
    expect(cfg.url).toBe('http://user-US-DE-rotate:pass@p.webshare.io:80/');
  });

  it('respects custom domain and port', () => {
    const cfg = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
      domainName: 'example.com',
      proxyPort: 1080,
    });
    expect(cfg.url).toBe('http://user-rotate:pass@example.com:1080/');
  });

  it('percent-encodes special characters in username and password', () => {
    const cfg = new WebshareProxyConfig({
      proxyUsername: 'us er',
      proxyPassword: 'p@ss:word',
    });
    expect(cfg.url).toContain('us%20er-rotate');
    expect(cfg.url).toContain('p%40ss%3Aword');
  });

  it('preventKeepingConnectionsAlive is true by default', () => {
    const cfg = new WebshareProxyConfig({
      proxyUsername: 'u',
      proxyPassword: 'p',
    });
    expect(cfg.preventKeepingConnectionsAlive).toBe(true);
  });

  it('retriesWhenBlocked defaults to 10', () => {
    const cfg = new WebshareProxyConfig({
      proxyUsername: 'u',
      proxyPassword: 'p',
    });
    expect(cfg.retriesWhenBlocked).toBe(10);
  });
});
