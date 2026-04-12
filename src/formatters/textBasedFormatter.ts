import type {
  FetchedTranscript,
  FetchedTranscriptSnippet,
} from '../transcripts/fetchedTranscript.js';
import { TextFormatter } from './textFormatter.js';

export abstract class TextBasedFormatter extends TextFormatter {
  protected abstract _formatTimestamp(
    hours: number,
    mins: number,
    secs: number,
    ms: number,
  ): string;

  protected abstract _formatTranscriptHeader(lines: string[]): string;

  protected abstract _formatTranscriptHelper(
    i: number,
    timeText: string,
    snippet: FetchedTranscriptSnippet,
  ): string;

  protected _secondsToTimestamp(time: number): string {
    const t = Number(time);
    const totalSecs = Math.floor(t);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs - hours * 3600) / 60);
    const secs = totalSecs - hours * 3600 - mins * 60;
    const ms = Math.round((t - totalSecs) * 1000);
    return this._formatTimestamp(hours, mins, secs, ms);
  }

  override formatTranscript(transcript: FetchedTranscript): string {
    const lines: string[] = [];
    const snippets = transcript.snippets;
    for (let i = 0; i < snippets.length; i++) {
      const line = snippets[i]!;
      const end = line.start + line.duration;
      const next = snippets[i + 1];
      const endTime =
        next !== undefined && next.start < end ? next.start : end;
      const timeText = `${this._secondsToTimestamp(line.start)} --> ${this._secondsToTimestamp(endTime)}`;
      lines.push(this._formatTranscriptHelper(i, timeText, line));
    }
    return this._formatTranscriptHeader(lines);
  }
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export { pad as _pad };
