import type { FetchedTranscriptSnippet } from '../transcripts/fetchedTranscript.js';
import { _pad, TextBasedFormatter } from './textBasedFormatter.js';

export class SRTFormatter extends TextBasedFormatter {
  protected override _formatTimestamp(
    hours: number,
    mins: number,
    secs: number,
    ms: number,
  ): string {
    return `${_pad(hours, 2)}:${_pad(mins, 2)}:${_pad(secs, 2)},${_pad(ms, 3)}`;
  }

  protected override _formatTranscriptHeader(lines: string[]): string {
    return lines.join('\n\n') + '\n';
  }

  protected override _formatTranscriptHelper(
    i: number,
    timeText: string,
    snippet: FetchedTranscriptSnippet,
  ): string {
    return `${i + 1}\n${timeText}\n${snippet.text}`;
  }
}
