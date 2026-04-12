import type { FetchedTranscript } from '../transcripts/fetchedTranscript.js';

export abstract class Formatter {
  abstract formatTranscript(
    transcript: FetchedTranscript,
    options?: Record<string, unknown>,
  ): string;

  abstract formatTranscripts(
    transcripts: FetchedTranscript[],
    options?: Record<string, unknown>,
  ): string;
}
