# Youtube Transcript Ts — `@hallelx/youtube-transcript`

[![npm version](https://img.shields.io/npm/v/@hallelx/youtube-transcript.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/@hallelx/youtube-transcript)
[![npm downloads](https://img.shields.io/npm/dm/@hallelx/youtube-transcript.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/@hallelx/youtube-transcript)
[![CI](https://github.com/hallelx2/youtube-transcript-ts/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hallelx2/youtube-transcript-ts/actions/workflows/ci.yml)
[![Release](https://github.com/hallelx2/youtube-transcript-ts/actions/workflows/release.yml/badge.svg)](https://github.com/hallelx2/youtube-transcript-ts/actions/workflows/release.yml)
[![Provenance](https://img.shields.io/badge/provenance-signed-success?logo=sigstore)](https://www.npmjs.com/package/@hallelx/youtube-transcript)
[![Types](https://img.shields.io/npm/types/@hallelx/youtube-transcript.svg?color=3178c6&logo=typescript)](https://www.npmjs.com/package/@hallelx/youtube-transcript)
[![Node](https://img.shields.io/node/v/@hallelx/youtube-transcript.svg?color=5fa04e&logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/npm/l/@hallelx/youtube-transcript.svg?color=blue)](./LICENSE)

Fetch transcripts and subtitles from YouTube videos. Works with both manually
created captions and auto-generated transcripts. Supports translation and
multiple output formats (JSON, text, SRT, WebVTT, pretty).

This is a faithful TypeScript port of the excellent Python library
[`youtube-transcript-api`](https://github.com/jdepoix/youtube-transcript-api)
by [jdepoix](https://github.com/jdepoix). It uses the same internal
`youtubei/v1/player` endpoint, so it does **not** scrape the YouTube web page
DOM and is much more resilient than HTML-scraping alternatives.

Runs on **Node.js (>=18)**, **Bun**, and **Deno** (with a custom `fetchFn` on
Deno when using proxies). Zero runtime dependencies in the common path.

## Installation

```bash
npm install @hallelx/youtube-transcript
# or
bun add @hallelx/youtube-transcript
# or
pnpm add @hallelx/youtube-transcript
```

## Quick start

```ts
import { YouTubeTranscriptApi } from '@hallelx/youtube-transcript';

const api = new YouTubeTranscriptApi();
const transcript = await api.fetch('arj7oStGLkU');

for (const snippet of transcript) {
  console.log(`[${snippet.start}s] ${snippet.text}`);
}
```

`fetch(videoId, options?)` returns a `FetchedTranscript` containing snippets,
the language, and metadata. The default language is English (`en`); pass
`languages` to specify a priority list:

```ts
const transcript = await api.fetch('arj7oStGLkU', {
  languages: ['de', 'en'], // try German first, fall back to English
});
```

## Listing available transcripts

```ts
const list = await api.list('arj7oStGLkU');

for (const transcript of list) {
  console.log(transcript.languageCode, transcript.language, transcript.isGenerated);
}

// Find a specific kind:
const manual = list.findManuallyCreatedTranscript(['en']);
const generated = list.findGeneratedTranscript(['en']);
const fetched = await manual.fetch();
```

## Translation

```ts
const list = await api.list('arj7oStGLkU');
const en = list.findTranscript(['en']);

if (en.isTranslatable) {
  const french = en.translate('fr');
  const fetched = await french.fetch();
  console.log(fetched.snippets);
}
```

## Output formatters

```ts
import {
  YouTubeTranscriptApi,
  JSONFormatter,
  SRTFormatter,
  WebVTTFormatter,
  TextFormatter,
} from '@hallelx/youtube-transcript';

const transcript = await new YouTubeTranscriptApi().fetch('arj7oStGLkU');

console.log(new JSONFormatter().formatTranscript(transcript, { indent: 2 }));
console.log(new SRTFormatter().formatTranscript(transcript));
console.log(new WebVTTFormatter().formatTranscript(transcript));
console.log(new TextFormatter().formatTranscript(transcript));
```

## Preserving HTML formatting

By default, all HTML tags are stripped from snippet text. To preserve a small
whitelist of formatting tags (`<strong>`, `<em>`, `<b>`, `<i>`, `<mark>`,
`<small>`, `<del>`, `<ins>`, `<sub>`, `<sup>`), pass `preserveFormatting: true`:

```ts
const transcript = await api.fetch('arj7oStGLkU', { preserveFormatting: true });
```

## CLI

The package ships a `youtube-transcript` binary:

```bash
youtube-transcript --list-transcripts arj7oStGLkU
youtube-transcript --languages en --format srt arj7oStGLkU
youtube-transcript --languages de en --format json arj7oStGLkU dQw4w9WgXcQ
youtube-transcript --translate fr arj7oStGLkU
```

Run `youtube-transcript --help` for the full list of options.

## Working around IP bans (proxies)

YouTube blocks IPs that make too many requests, especially from cloud
providers. The library exposes two proxy configurations:

### Generic HTTP/HTTPS proxy

```ts
import { YouTubeTranscriptApi, GenericProxyConfig } from '@hallelx/youtube-transcript';

const api = new YouTubeTranscriptApi({
  proxyConfig: new GenericProxyConfig({
    httpUrl: 'http://user:pass@proxy.example.com:8080',
    httpsUrl: 'http://user:pass@proxy.example.com:8080',
  }),
});
```

### Webshare rotating residential proxies (recommended)

```ts
import { YouTubeTranscriptApi, WebshareProxyConfig } from '@hallelx/youtube-transcript';

const api = new YouTubeTranscriptApi({
  proxyConfig: new WebshareProxyConfig({
    proxyUsername: 'your-webshare-username',
    proxyPassword: 'your-webshare-password',
  }),
});
```

### Runtime support for proxies

- **Node.js**: requires the optional peer dependency `undici`. Install it once
  with `npm install undici`. The library lazy-loads it only when a proxy is in
  use.
- **Bun**: uses Bun's native `fetch({ proxy })` option — no extra deps needed.
- **Deno**: pass a custom `fetchFn` configured with `Deno.createHttpClient`.

### Custom `fetchFn`

For full control (custom HTTPS agents, retries, telemetry), inject your own
fetch implementation:

```ts
const api = new YouTubeTranscriptApi({
  fetchFn: async (input, init) => {
    // wrap the global fetch, plug in middleware, etc.
    return fetch(input, init);
  },
});
```

### Partial blocking (transcript fallback)

Sometimes YouTube allows the initial metadata discovery (the `list()` call) but
blocks the final transcript fetch. For this case, you can provide a
`transcriptFetchFallback` to route only the final step through a proxy or relay:

```ts
const api = new YouTubeTranscriptApi({
  transcriptFetchFallback: async (signedUrl, videoId) => {
    // signedUrl contains a temporary auth token. Your proxy will see this.
    const res = await fetch(
      `https://your-proxy.io/?url=${encodeURIComponent(signedUrl)}`,
    );
    return res.ok ? res : null;
  },
});

// fetch() will now use the fallback automatically if the primary request is blocked
const transcript = await api.fetch('arj7oStGLkU');
```

**Note:** Free public CORS proxies have no SLA and are often unreliable for
production use. For serious workloads, it is recommended to use a residential
proxy provider or a dedicated transcription service.

## Error handling

All exceptions extend `YouTubeTranscriptApiException`. The most useful
subclasses are:

| Error | When |
| --- | --- |
| `VideoUnavailable` | Video doesn't exist or has been removed |
| `InvalidVideoId` | A URL was passed instead of a video ID |
| `VideoUnplayable` | Region-blocked, copyright strike, or similar |
| `AgeRestricted` | Video requires sign-in for age verification |
| `TranscriptsDisabled` | Video has no captions enabled |
| `NoTranscriptFound` | None of the requested languages exist |
| `NotTranslatable` | Tried to translate a non-translatable transcript |
| `TranslationLanguageNotAvailable` | Translation target language unavailable |
| `RequestBlocked` / `IpBlocked` | YouTube blocked your IP |
| `PoTokenRequired` | Video requires a PO Token (rare) |
| `FailedToCreateConsentCookie` | Could not bypass the EU consent screen |
| `YouTubeRequestFailed` | Underlying HTTP request failed |
| `YouTubeDataUnparsable` | YouTube response shape changed unexpectedly |

```ts
import {
  YouTubeTranscriptApi,
  TranscriptsDisabled,
  NoTranscriptFound,
} from '@hallelx/youtube-transcript';

try {
  const transcript = await new YouTubeTranscriptApi().fetch('xxx');
} catch (err) {
  if (err instanceof TranscriptsDisabled) {
    console.log('No captions on this video');
  } else if (err instanceof NoTranscriptFound) {
    console.log('No transcript in the requested language');
  } else {
    throw err;
  }
}
```

## API surface

```ts
class YouTubeTranscriptApi {
  constructor(options?: {
    proxyConfig?: ProxyConfig;
    fetchFn?: typeof fetch;
    transcriptFetchFallback?: (signedUrl: string, videoId: string) => Promise<Response | null>;
  });
  fetch(videoId: string, options?: { languages?: string[]; preserveFormatting?: boolean }): Promise<FetchedTranscript>;
  list(videoId: string): Promise<TranscriptList>;
}

class TranscriptList implements Iterable<Transcript> {
  videoId: string;
  findTranscript(languageCodes: Iterable<string>): Transcript;
  findManuallyCreatedTranscript(languageCodes: Iterable<string>): Transcript;
  findGeneratedTranscript(languageCodes: Iterable<string>): Transcript;
}

class Transcript {
  videoId: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;
  isTranslatable: boolean;
  translationLanguages: readonly TranslationLanguage[];
  fetch(options?: { preserveFormatting?: boolean }): Promise<FetchedTranscript>;
  translate(languageCode: string): Transcript;
}

class FetchedTranscript implements Iterable<FetchedTranscriptSnippet> {
  snippets: FetchedTranscriptSnippet[];
  videoId: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;
  toRawData(): Array<{ text: string; start: number; duration: number }>;
}

interface FetchedTranscriptSnippet {
  text: string;
  start: number;     // seconds
  duration: number;  // seconds
}
```

## Differences from the Python library

- `pretty` formatter uses `JSON.stringify(data, null, 2)` instead of Python's
  `pprint`. The output is intended for human reading and the structure is the
  same.
- `WebshareProxyConfig` percent-encodes the username and password when building
  the proxy URL (Python relies on the `requests` library to handle this).
- The constructor takes `fetchFn?: typeof fetch` rather than a
  `requests.Session` instance.

## License

MIT. This package is a port of
[`youtube-transcript-api`](https://github.com/jdepoix/youtube-transcript-api)
by jdepoix, also MIT-licensed. Please consider supporting the upstream project.
