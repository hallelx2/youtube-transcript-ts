import { describe, expect, it } from 'vitest';
import {
  CouldNotRetrieveTranscript,
  IpBlocked,
  NoTranscriptFound,
  NotTranslatable,
  RequestBlocked,
  TranscriptsDisabled,
  VideoUnavailable,
  VideoUnplayable,
  YouTubeRequestFailed,
  YouTubeTranscriptApiException,
} from '../src/errors/index.js';
import { GenericProxyConfig } from '../src/proxies/genericProxyConfig.js';
import { WebshareProxyConfig } from '../src/proxies/webshareProxyConfig.js';

describe('error classes', () => {
  it('CouldNotRetrieveTranscript message includes video URL', () => {
    const e = new VideoUnavailable('abc123');
    expect(e.message).toContain('https://www.youtube.com/watch?v=abc123');
    expect(e.message).toContain('The video is no longer available');
    expect(e instanceof YouTubeTranscriptApiException).toBe(true);
    expect(e instanceof CouldNotRetrieveTranscript).toBe(true);
  });

  it('TranscriptsDisabled has the expected cause', () => {
    expect(new TranscriptsDisabled('vid').message).toContain(
      'Subtitles are disabled for this video',
    );
  });

  it('YouTubeRequestFailed includes the underlying reason', () => {
    const e = new YouTubeRequestFailed('vid', '500 Server Error');
    expect(e.message).toContain('Request to YouTube failed: 500 Server Error');
  });

  it('VideoUnplayable formats subreasons', () => {
    const e = new VideoUnplayable('vid', 'main reason', ['sub1', 'sub2']);
    expect(e.message).toContain('main reason');
    expect(e.message).toContain('Additional Details');
    expect(e.message).toContain(' - sub1');
    expect(e.message).toContain(' - sub2');
  });

  it('NotTranslatable extends CouldNotRetrieveTranscript', () => {
    const e = new NotTranslatable('vid');
    expect(e instanceof CouldNotRetrieveTranscript).toBe(true);
  });

  it('NoTranscriptFound formats requested codes and transcript data', () => {
    const e = new NoTranscriptFound('vid', ['de', 'en'], {
      toString: () => 'TRANSCRIPT_DATA_BLOB',
    });
    expect(e.message).toContain("'de'");
    expect(e.message).toContain("'en'");
    expect(e.message).toContain('TRANSCRIPT_DATA_BLOB');
  });

  it('IpBlocked is a subclass of RequestBlocked', () => {
    expect(new IpBlocked('vid') instanceof RequestBlocked).toBe(true);
  });

  it('RequestBlocked.withProxyConfig switches the cause for Webshare', () => {
    const e = new RequestBlocked('vid');
    e.withProxyConfig(
      new WebshareProxyConfig({ proxyUsername: 'u', proxyPassword: 'p' }),
    );
    expect(e.message).toContain('Webshare proxies');
  });

  it('RequestBlocked.withProxyConfig switches to generic message for GenericProxyConfig', () => {
    const e = new RequestBlocked('vid');
    e.withProxyConfig(new GenericProxyConfig({ httpUrl: 'http://x' }));
    expect(e.message).toContain('despite you using proxies');
  });
});
