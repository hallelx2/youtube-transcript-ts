import { NotTranslatable, PoTokenRequired, TranslationLanguageNotAvailable, YouTubeRequestFailed, IpBlocked } from '../errors/index.js';
import type { HttpClient } from '../utils/httpClient.js';
import { FetchedTranscript, type FetchedTranscriptSnippet } from './fetchedTranscript.js';
import { TranscriptParser } from './parser.js';

export interface TranslationLanguage {
  language: string;
  languageCode: string;
}

export interface TranscriptFetchOptions {
  preserveFormatting?: boolean;
}

export class Transcript {
  readonly videoId: string;
  readonly language: string;
  readonly languageCode: string;
  readonly isGenerated: boolean;
  readonly translationLanguages: readonly TranslationLanguage[];

  private readonly _httpClient: HttpClient;
  private readonly _url: string;
  private readonly _translationLanguagesByCode: Map<string, string>;

  constructor(
    httpClient: HttpClient,
    videoId: string,
    url: string,
    language: string,
    languageCode: string,
    isGenerated: boolean,
    translationLanguages: readonly TranslationLanguage[],
  ) {
    this._httpClient = httpClient;
    this.videoId = videoId;
    this._url = url;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
    this.translationLanguages = translationLanguages;
    this._translationLanguagesByCode = new Map(
      translationLanguages.map((tl) => [tl.languageCode, tl.language]),
    );
  }

  get isTranslatable(): boolean {
    return this.translationLanguages.length > 0;
  }

  async fetch(options: TranscriptFetchOptions = {}): Promise<FetchedTranscript> {
    if (this._url.includes('&exp=xpe')) {
      throw new PoTokenRequired(this.videoId);
    }
    const response = await this._httpClient.get(this._url);
    if (response.status === 429) {
      throw new IpBlocked(this.videoId);
    }
    if (!response.ok) {
      throw new YouTubeRequestFailed(
        this.videoId,
        `${response.status} ${response.statusText}`,
      );
    }
    const xml = await response.text();
    const parser = new TranscriptParser(options.preserveFormatting ?? false);
    const snippets: FetchedTranscriptSnippet[] = parser.parse(xml);
    return new FetchedTranscript({
      snippets,
      videoId: this.videoId,
      language: this.language,
      languageCode: this.languageCode,
      isGenerated: this.isGenerated,
    });
  }

  translate(languageCode: string): Transcript {
    if (!this.isTranslatable) {
      throw new NotTranslatable(this.videoId);
    }
    const targetLanguage = this._translationLanguagesByCode.get(languageCode);
    if (targetLanguage === undefined) {
      throw new TranslationLanguageNotAvailable(this.videoId);
    }
    return new Transcript(
      this._httpClient,
      this.videoId,
      `${this._url}&tlang=${languageCode}`,
      targetLanguage,
      languageCode,
      true,
      [],
    );
  }

  toString(): string {
    return `${this.languageCode} ("${this.language}")${
      this.isTranslatable ? '[TRANSLATABLE]' : ''
    }`;
  }
}
