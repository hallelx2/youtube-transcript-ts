export interface FetchedTranscriptSnippet {
  text: string;
  start: number;
  duration: number;
}

export interface FetchedTranscriptInit {
  snippets: FetchedTranscriptSnippet[];
  videoId: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;
}

export class FetchedTranscript {
  readonly snippets: FetchedTranscriptSnippet[];
  readonly videoId: string;
  readonly language: string;
  readonly languageCode: string;
  readonly isGenerated: boolean;

  constructor(init: FetchedTranscriptInit) {
    this.snippets = init.snippets;
    this.videoId = init.videoId;
    this.language = init.language;
    this.languageCode = init.languageCode;
    this.isGenerated = init.isGenerated;
  }

  [Symbol.iterator](): IterableIterator<FetchedTranscriptSnippet> {
    return this.snippets[Symbol.iterator]();
  }

  get length(): number {
    return this.snippets.length;
  }

  toRawData(): Array<{ text: string; start: number; duration: number }> {
    return this.snippets.map((s) => ({
      text: s.text,
      start: s.start,
      duration: s.duration,
    }));
  }
}
