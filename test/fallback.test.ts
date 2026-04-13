import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { YouTubeTranscriptApi } from '../src/api.js';
import {
  IpBlocked,
  PoTokenRequired,
} from '../src/errors/index.js';

function asset(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`./assets/${name}`, import.meta.url)),
    'utf8',
  );
}

const VIDEO_ID = 'GJLlxj_dtq8';

const HAPPY_HTML = asset('youtube.html.static');
const HAPPY_INNERTUBE = asset('youtube.innertube.json.static');
const TRANSCRIPT_XML = asset('transcript.xml.static');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('transcriptFetchFallback', () => {
  it('is called exactly once when the primary fetch throws IpBlocked', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return new Response(HAPPY_HTML);
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return new Response(HAPPY_INNERTUBE, { headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/api/timedtext')) {
        return new Response('Blocked', { status: 429 });
      }
      return new Response('Not Found', { status: 404 });
    });

    const fallback = vi.fn(async () => {
      return new Response(TRANSCRIPT_XML);
    });

    const api = new YouTubeTranscriptApi({ fetchFn, transcriptFetchFallback: fallback });
    await api.fetch(VIDEO_ID);

    expect(fallback).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledWith(
      expect.stringContaining('/api/timedtext'),
      VIDEO_ID,
    );
  });

  it('is NOT called when the primary fetch succeeds', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return new Response(HAPPY_HTML);
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return new Response(HAPPY_INNERTUBE, { headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/api/timedtext')) {
        return new Response(TRANSCRIPT_XML, { headers: { 'Content-Type': 'application/xml' } });
      }
      return new Response('Not Found', { status: 404 });
    });

    const fallback = vi.fn();

    const api = new YouTubeTranscriptApi({ fetchFn, transcriptFetchFallback: fallback });
    await api.fetch(VIDEO_ID);

    expect(fallback).not.toHaveBeenCalled();
  });

  it('is NOT called for PoTokenRequired', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return new Response(HAPPY_HTML);
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return new Response(asset('youtube_po_token_required.innertube.json.static'), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not Found', { status: 404 });
    });

    const fallback = vi.fn();

    const api = new YouTubeTranscriptApi({ fetchFn, transcriptFetchFallback: fallback });
    await expect(api.fetch(VIDEO_ID)).rejects.toBeInstanceOf(PoTokenRequired);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('re-raises the original error when fallback returns null', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return new Response(HAPPY_HTML);
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return new Response(HAPPY_INNERTUBE, { headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/api/timedtext')) {
        return new Response('Blocked', { status: 429 });
      }
      return new Response('Not Found', { status: 404 });
    });

    const fallback = vi.fn(async () => null);

    const api = new YouTubeTranscriptApi({ fetchFn, transcriptFetchFallback: fallback });
    await expect(api.fetch(VIDEO_ID)).rejects.toBeInstanceOf(IpBlocked);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('produces a parsed FetchedTranscript when fallback returns a valid Response', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return new Response(HAPPY_HTML);
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return new Response(HAPPY_INNERTUBE, { headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/api/timedtext')) {
        return new Response('Blocked', { status: 429 });
      }
      return new Response('Not Found', { status: 404 });
    });

    const fallback = vi.fn(async () => {
      return new Response(TRANSCRIPT_XML);
    });

    const api = new YouTubeTranscriptApi({ fetchFn, transcriptFetchFallback: fallback });
    const transcript = await api.fetch(VIDEO_ID);

    expect(transcript.snippets.length).toBeGreaterThan(0);
    expect(transcript.snippets[0].text).toBe('Hey, this is just a test');
    expect(fallback).toHaveBeenCalledTimes(1);
  });
});
