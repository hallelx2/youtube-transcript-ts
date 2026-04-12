import type { FetchedTranscriptSnippet } from '../transcripts/fetchedTranscript.js';
import { _pad, TextBasedFormatter } from './textBasedFormatter.js';

export class WebVTTFormatter extends TextBasedFormatter {
  protected override _formatTimestamp(
    hours: number,
    mins: number,
    secs: number,
    ms: number,
  ): string {
    return `${_pad(hours, 2)}:${_pad(mins, 2)}:${_pad(secs, 2)}.${_pad(ms, 3)}`;
  }

  protected override _formatTranscriptHeader(lines: string[]): string {
    return 'WEBVTT\n\n' + lines.join('\n\n') + '\n';
  }

  protected override _formatTranscriptHelper(
    _i: number,
    timeText: string,
    snippet: FetchedTranscriptSnippet,
  ): string {
    return `${timeText}\n${snippet.text}`;
  }
}
