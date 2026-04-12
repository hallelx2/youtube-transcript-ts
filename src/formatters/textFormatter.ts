import type { FetchedTranscript } from '../transcripts/fetchedTranscript.js';
import { Formatter } from './base.js';

export class TextFormatter extends Formatter {
  override formatTranscript(transcript: FetchedTranscript): string {
    return transcript.snippets.map((s) => s.text).join('\n');
  }

  override formatTranscripts(transcripts: FetchedTranscript[]): string {
    return transcripts.map((t) => this.formatTranscript(t)).join('\n\n\n');
  }
}
