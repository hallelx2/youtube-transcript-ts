import type { FetchedTranscript } from '../transcripts/fetchedTranscript.js';
import { Formatter } from './base.js';

export interface JsonFormatterOptions {
  indent?: number | string;
}

export class JSONFormatter extends Formatter {
  override formatTranscript(
    transcript: FetchedTranscript,
    options: JsonFormatterOptions = {},
  ): string {
    return JSON.stringify(transcript.toRawData(), null, options.indent);
  }

  override formatTranscripts(
    transcripts: FetchedTranscript[],
    options: JsonFormatterOptions = {},
  ): string {
    return JSON.stringify(
      transcripts.map((t) => t.toRawData()),
      null,
      options.indent,
    );
  }
}
