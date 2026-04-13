import { NoTranscriptFound } from '../errors/index.js';
import type { HttpClient } from '../utils/httpClient.js';
import {
  Transcript,
  type TranscriptFetchFallback,
  type TranslationLanguage,
} from './transcript.js';

interface RawCaptionTrack {
  baseUrl: string;
  name: { runs: Array<{ text: string }> };
  languageCode: string;
  isTranslatable?: boolean;
  kind?: string;
}

interface RawTranslationLanguage {
  languageCode: string;
  languageName: { runs: Array<{ text: string }> };
}

export interface CaptionsJson {
  captionTracks: RawCaptionTrack[];
  translationLanguages?: RawTranslationLanguage[];
}

export class TranscriptList implements Iterable<Transcript> {
  readonly videoId: string;
  private readonly _manuallyCreated: Map<string, Transcript>;
  private readonly _generated: Map<string, Transcript>;
  private readonly _translationLanguages: readonly TranslationLanguage[];

  constructor(
    videoId: string,
    manuallyCreated: Map<string, Transcript>,
    generated: Map<string, Transcript>,
    translationLanguages: readonly TranslationLanguage[],
  ) {
    this.videoId = videoId;
    this._manuallyCreated = manuallyCreated;
    this._generated = generated;
    this._translationLanguages = translationLanguages;
  }

  static build(
    httpClient: HttpClient,
    videoId: string,
    captionsJson: CaptionsJson,
    fallback?: TranscriptFetchFallback,
  ): TranscriptList {
    const translationLanguages: TranslationLanguage[] = (
      captionsJson.translationLanguages ?? []
    ).map((tl) => ({
      language: tl.languageName.runs[0]?.text ?? '',
      languageCode: tl.languageCode,
    }));

    const manuallyCreated = new Map<string, Transcript>();
    const generated = new Map<string, Transcript>();

    for (const caption of captionsJson.captionTracks) {
      const isAsr = caption.kind === 'asr';
      const target = isAsr ? generated : manuallyCreated;
      const cleanedUrl = caption.baseUrl.replace('&fmt=srv3', '');
      const transcriptTranslationLangs = caption.isTranslatable
        ? translationLanguages
        : [];
      target.set(
        caption.languageCode,
        new Transcript(
          httpClient,
          videoId,
          cleanedUrl,
          caption.name.runs[0]?.text ?? '',
          caption.languageCode,
          isAsr,
          transcriptTranslationLangs,
          fallback,
        ),
      );
    }

    return new TranscriptList(
      videoId,
      manuallyCreated,
      generated,
      translationLanguages,
    );
  }

  *[Symbol.iterator](): IterableIterator<Transcript> {
    for (const t of this._manuallyCreated.values()) yield t;
    for (const t of this._generated.values()) yield t;
  }

  findTranscript(languageCodes: Iterable<string>): Transcript {
    return this._findTranscript(languageCodes, [
      this._manuallyCreated,
      this._generated,
    ]);
  }

  findGeneratedTranscript(languageCodes: Iterable<string>): Transcript {
    return this._findTranscript(languageCodes, [this._generated]);
  }

  findManuallyCreatedTranscript(languageCodes: Iterable<string>): Transcript {
    return this._findTranscript(languageCodes, [this._manuallyCreated]);
  }

  private _findTranscript(
    languageCodes: Iterable<string>,
    transcriptDicts: ReadonlyArray<Map<string, Transcript>>,
  ): Transcript {
    const codes = Array.from(languageCodes);
    for (const code of codes) {
      for (const dict of transcriptDicts) {
        const found = dict.get(code);
        if (found !== undefined) return found;
      }
    }
    throw new NoTranscriptFound(this.videoId, codes, this);
  }

  toString(): string {
    const describe = (lines: string[]): string =>
      lines.length === 0 ? 'None' : lines.map((l) => ` - ${l}`).join('\n');

    const manuallyCreated = describe(
      Array.from(this._manuallyCreated.values()).map((t) => t.toString()),
    );
    const generated = describe(
      Array.from(this._generated.values()).map((t) => t.toString()),
    );
    const translations = describe(
      this._translationLanguages.map(
        (tl) => `${tl.languageCode} ("${tl.language}")`,
      ),
    );

    return (
      `For this video (${this.videoId}) transcripts are available in the following languages:\n\n` +
      `(MANUALLY CREATED)\n${manuallyCreated}\n\n` +
      `(GENERATED)\n${generated}\n\n` +
      `(TRANSLATION LANGUAGES)\n${translations}`
    );
  }
}
