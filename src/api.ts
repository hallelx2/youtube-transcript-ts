import type { ProxyConfig } from './proxies/proxyConfig.js';
import type { FetchedTranscript } from './transcripts/fetchedTranscript.js';
import { TranscriptListFetcher } from './transcripts/fetcher.js';
import type { TranscriptList } from './transcripts/transcriptList.js';
import { HttpClient, type FetchFn } from './utils/httpClient.js';

export interface YouTubeTranscriptApiOptions {
  proxyConfig?: ProxyConfig;
  fetchFn?: FetchFn;
}

export interface FetchOptions {
  languages?: Iterable<string>;
  preserveFormatting?: boolean;
}

export class YouTubeTranscriptApi {
  private readonly _httpClient: HttpClient;
  private readonly _fetcher: TranscriptListFetcher;

  constructor(options: YouTubeTranscriptApiOptions = {}) {
    this._httpClient = new HttpClient(options);
    this._fetcher = new TranscriptListFetcher(this._httpClient, options.proxyConfig);
  }

  async list(videoId: string): Promise<TranscriptList> {
    return this._fetcher.fetch(videoId);
  }

  async fetch(
    videoId: string,
    options: FetchOptions = {},
  ): Promise<FetchedTranscript> {
    const languages = Array.from(options.languages ?? ['en']);
    const transcriptList = await this.list(videoId);
    const transcript = transcriptList.findTranscript(languages);
    return transcript.fetch({
      preserveFormatting: options.preserveFormatting ?? false,
    });
  }
}
