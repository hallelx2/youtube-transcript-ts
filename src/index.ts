export { YouTubeTranscriptApi } from './api.js';
export type { YouTubeTranscriptApiOptions, FetchOptions } from './api.js';

export { Transcript } from './transcripts/transcript.js';
export type {
  TranslationLanguage,
  TranscriptFetchOptions,
  TranscriptFetchFallback,
} from './transcripts/transcript.js';
export { TranscriptList } from './transcripts/transcriptList.js';
export type { CaptionsJson } from './transcripts/transcriptList.js';
export {
  FetchedTranscript,
} from './transcripts/fetchedTranscript.js';
export type {
  FetchedTranscriptSnippet,
  FetchedTranscriptInit,
} from './transcripts/fetchedTranscript.js';
export { TranscriptListFetcher } from './transcripts/fetcher.js';
export { TranscriptParser } from './transcripts/parser.js';

export {
  ProxyConfig,
  GenericProxyConfig,
  WebshareProxyConfig,
  InvalidProxyConfig,
} from './proxies/index.js';
export type {
  GenericProxyConfigOptions,
  WebshareProxyConfigOptions,
} from './proxies/index.js';

export {
  Formatter,
  JSONFormatter,
  PrettyPrintFormatter,
  TextFormatter,
  TextBasedFormatter,
  SRTFormatter,
  WebVTTFormatter,
  FormatterLoader,
  UnknownFormatterType,
} from './formatters/index.js';
export type {
  JsonFormatterOptions,
  FormatterType,
} from './formatters/index.js';

export {
  YouTubeTranscriptApiException,
  CookieError,
  CookiePathInvalid,
  CookieInvalid,
  CouldNotRetrieveTranscript,
  YouTubeDataUnparsable,
  YouTubeRequestFailed,
  VideoUnplayable,
  VideoUnavailable,
  InvalidVideoId,
  RequestBlocked,
  IpBlocked,
  TranscriptsDisabled,
  AgeRestricted,
  NotTranslatable,
  TranslationLanguageNotAvailable,
  FailedToCreateConsentCookie,
  NoTranscriptFound,
  PoTokenRequired,
} from './errors/index.js';

export { HttpClient } from './utils/httpClient.js';
export type { FetchFn, HttpClientOptions } from './utils/httpClient.js';

export {
  WATCH_URL_TEMPLATE,
  INNERTUBE_API_URL_TEMPLATE,
  INNERTUBE_CONTEXT,
  watchUrl,
  innertubeApiUrl,
} from './settings.js';
