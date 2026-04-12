import type { FetchedTranscript } from '../transcripts/fetchedTranscript.js';
import { Formatter } from './base.js';

/**
 * Pretty-prints a transcript using JSON.stringify with two-space indentation.
 *
 * Note: this differs from the Python upstream, which uses Python's `pprint`
 * module (producing Python-repr style output). The TypeScript port uses
 * indented JSON for the same human-readable purpose.
 */
export class PrettyPrintFormatter extends Formatter {
  override formatTranscript(transcript: FetchedTranscript): string {
    return JSON.stringify(transcript.toRawData(), null, 2);
  }

  override formatTranscripts(transcripts: FetchedTranscript[]): string {
    return JSON.stringify(
      transcripts.map((t) => t.toRawData()),
      null,
      2,
    );
  }
}
