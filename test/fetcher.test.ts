import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { YouTubeTranscriptApi } from '../src/api.js';
import {
  AgeRestricted,
  FailedToCreateConsentCookie,
  InvalidVideoId,
  IpBlocked,
  NoTranscriptFound,
  NotTranslatable,
  PoTokenRequired,
  RequestBlocked,
  TranscriptsDisabled,
  TranslationLanguageNotAvailable,
  VideoUnavailable,
  VideoUnplayable,
  YouTubeRequestFailed,
} from '../src/errors/index.js';

function asset(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`./assets/${name}`, import.meta.url)),
    'utf8',
  );
}

const VIDEO_ID = 'GJLlxj_dtq8';

interface RouteResponse {
  status?: number;
  body: string;
  contentType?: string;
}

type RouteResolver = (url: string, init: RequestInit) => RouteResponse | undefined;

function mockFetch(routes: RouteResolver | RouteResponse[]): typeof fetch {
  let index = 0;
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    let response: RouteResponse | undefined;
    if (typeof routes === 'function') {
      response = routes(url, init ?? {});
    } else {
      response = routes[index];
      index++;
    }
    if (!response) {
      throw new Error(`mockFetch: no route for ${url}`);
    }
    return new Response(response.body, {
      status: response.status ?? 200,
      headers: { 'Content-Type': response.contentType ?? 'text/plain' },
    });
  }) as unknown as typeof fetch;
}

const HAPPY_HTML = asset('youtube.html.static');
const HAPPY_INNERTUBE = asset('youtube.innertube.json.static');
const TRANSCRIPT_XML = asset('transcript.xml.static');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TranscriptListFetcher (fixture-driven)', () => {
  it('fetches a transcript end-to-end (happy path)', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return { body: HAPPY_INNERTUBE, contentType: 'application/json' };
      }
      if (url.includes('/api/timedtext')) {
        return { body: TRANSCRIPT_XML, contentType: 'application/xml' };
      }
      return undefined;
    });

    const api = new YouTubeTranscriptApi({ fetchFn });
    const transcript = await api.fetch(VIDEO_ID);
    expect(transcript.snippets).toEqual([
      { text: 'Hey, this is just a test', start: 0, duration: 1.54 },
      { text: 'this is not the original transcript', start: 1.54, duration: 4.16 },
      {
        text: 'just something shorter, I made up for testing',
        start: 5.7,
        duration: 3.239,
      },
    ]);
    expect(transcript.videoId).toBe(VIDEO_ID);
    expect(transcript.languageCode).toBe('en');
    expect(transcript.isGenerated).toBe(false);
  });

  it('lists transcripts and exposes manual + generated tracks', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return { body: HAPPY_INNERTUBE, contentType: 'application/json' };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    const list = await api.list(VIDEO_ID);
    const manual = list.findManuallyCreatedTranscript(['en']);
    const generated = list.findGeneratedTranscript(['en']);
    expect(manual.languageCode).toBe('en');
    expect(manual.isGenerated).toBe(false);
    expect(generated.isGenerated).toBe(true);
  });

  it('throws NoTranscriptFound when language is missing', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return { body: HAPPY_INNERTUBE, contentType: 'application/json' };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.fetch(VIDEO_ID, { languages: ['xyz'] })).rejects.toBeInstanceOf(
      NoTranscriptFound,
    );
  });

  it('throws AgeRestricted', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return {
          body: asset('youtube_age_restricted.innertube.json.static'),
          contentType: 'application/json',
        };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list(VIDEO_ID)).rejects.toBeInstanceOf(AgeRestricted);
  });

  it('throws RequestBlocked when bot detected', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return {
          body: asset('youtube_request_blocked.innertube.json.static'),
          contentType: 'application/json',
        };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list(VIDEO_ID)).rejects.toBeInstanceOf(RequestBlocked);
  });

  it('throws VideoUnavailable for an unavailable video', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return {
          body: asset('youtube_video_unavailable.innertube.json.static'),
          contentType: 'application/json',
        };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list(VIDEO_ID)).rejects.toBeInstanceOf(VideoUnavailable);
  });

  it('throws InvalidVideoId when video_id is a URL and video is unavailable', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return {
          body: asset('youtube_video_unavailable.innertube.json.static'),
          contentType: 'application/json',
        };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list('https://www.youtube.com/watch?v=abc')).rejects.toBeInstanceOf(
      InvalidVideoId,
    );
  });

  it('throws VideoUnplayable with subreasons', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return {
          body: asset('youtube_unplayable.innertube.json.static'),
          contentType: 'application/json',
        };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list(VIDEO_ID)).rejects.toBeInstanceOf(VideoUnplayable);
  });

  it('throws TranscriptsDisabled when captionTracks is missing', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return {
          body: asset('youtube_transcripts_disabled.innertube.json.static'),
          contentType: 'application/json',
        };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list(VIDEO_ID)).rejects.toBeInstanceOf(TranscriptsDisabled);
  });

  it('throws TranscriptsDisabled when captionTracks is empty', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return {
          body: asset('youtube_transcripts_disabled2.innertube.json.static'),
          contentType: 'application/json',
        };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list(VIDEO_ID)).rejects.toBeInstanceOf(TranscriptsDisabled);
  });

  it('throws IpBlocked when watch HTML contains a reCAPTCHA', async () => {
    const fetchFn = mockFetch(() => ({
      body: asset('youtube_too_many_requests.html.static'),
    }));
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list(VIDEO_ID)).rejects.toBeInstanceOf(IpBlocked);
  });

  it('throws IpBlocked on HTTP 429', async () => {
    const fetchFn = mockFetch(() => ({ status: 429, body: 'too many' }));
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list(VIDEO_ID)).rejects.toBeInstanceOf(IpBlocked);
  });

  it('throws YouTubeRequestFailed on HTTP 500', async () => {
    const fetchFn = mockFetch(() => ({ status: 500, body: 'server error' }));
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list(VIDEO_ID)).rejects.toBeInstanceOf(YouTubeRequestFailed);
  });

  it('handles the consent flow by setting CONSENT cookie and retrying', async () => {
    const responses: RouteResponse[] = [];
    const fetchFn = mockFetch((url, init) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        // First request: consent page. Second request (after cookie set): happy HTML.
        const cookieHeader =
          (init.headers instanceof Headers
            ? init.headers.get('Cookie')
            : undefined) ?? '';
        if (cookieHeader.includes('CONSENT=YES+')) {
          responses.push({ body: 'with-cookie' });
          return { body: HAPPY_HTML };
        }
        responses.push({ body: 'without-cookie' });
        return { body: asset('youtube_consent_page.html.static') };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return { body: HAPPY_INNERTUBE, contentType: 'application/json' };
      }
      if (url.includes('/api/timedtext')) {
        return { body: TRANSCRIPT_XML, contentType: 'application/xml' };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    const transcript = await api.fetch(VIDEO_ID);
    expect(transcript.snippets.length).toBe(3);
    // Two consent attempts at minimum recorded
    expect(responses.some((r) => r.body === 'without-cookie')).toBe(true);
    expect(responses.some((r) => r.body === 'with-cookie')).toBe(true);
  });

  it('throws FailedToCreateConsentCookie when consent value cannot be extracted', async () => {
    const fetchFn = mockFetch(() => ({
      body: asset('youtube_consent_page_invalid.html.static'),
    }));
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.list(VIDEO_ID)).rejects.toBeInstanceOf(
      FailedToCreateConsentCookie,
    );
  });

  it('throws PoTokenRequired when transcript URL contains &exp=xpe', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return {
          body: asset('youtube_po_token_required.innertube.json.static'),
          contentType: 'application/json',
        };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    await expect(api.fetch(VIDEO_ID)).rejects.toBeInstanceOf(PoTokenRequired);
  });

  it('translate() throws NotTranslatable when source has no translation languages', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return { body: HAPPY_INNERTUBE, contentType: 'application/json' };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    const list = await api.list(VIDEO_ID);
    const en = list.findTranscript(['en']);
    // Translate to a language that exists (smoke check), then translate the
    // returned (already-translated) transcript again — that one has empty
    // translation_languages and should throw NotTranslatable.
    const translated = en.translate('ar');
    expect(() => translated.translate('de')).toThrow(NotTranslatable);
  });

  it('translate() throws TranslationLanguageNotAvailable for unknown target language', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.startsWith('https://www.youtube.com/watch?v=')) {
        return { body: HAPPY_HTML };
      }
      if (url.startsWith('https://www.youtube.com/youtubei/v1/player')) {
        return { body: HAPPY_INNERTUBE, contentType: 'application/json' };
      }
      return undefined;
    });
    const api = new YouTubeTranscriptApi({ fetchFn });
    const list = await api.list(VIDEO_ID);
    const en = list.findTranscript(['en']);
    expect(() => en.translate('zzz')).toThrow(TranslationLanguageNotAvailable);
  });
});
