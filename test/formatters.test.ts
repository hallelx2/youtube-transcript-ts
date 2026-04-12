import { describe, expect, it } from 'vitest';
import {
  FormatterLoader,
  JSONFormatter,
  PrettyPrintFormatter,
  SRTFormatter,
  TextFormatter,
  UnknownFormatterType,
  WebVTTFormatter,
} from '../src/formatters/index.js';
import { FetchedTranscript } from '../src/transcripts/fetchedTranscript.js';

const REF = new FetchedTranscript({
  snippets: [
    { text: 'Hey, this is just a test', start: 0, duration: 1.54 },
    { text: 'this is not the original transcript', start: 1.54, duration: 4.16 },
    {
      text: 'just something shorter, I made up for testing',
      start: 5.7,
      duration: 3.239,
    },
  ],
  videoId: 'GJLlxj_dtq8',
  language: 'English',
  languageCode: 'en',
  isGenerated: false,
});

describe('TextFormatter', () => {
  it('joins snippets with newlines', () => {
    const out = new TextFormatter().formatTranscript(REF);
    expect(out).toBe(
      'Hey, this is just a test\n' +
        'this is not the original transcript\n' +
        'just something shorter, I made up for testing',
    );
  });

  it('joins multiple transcripts with triple newlines', () => {
    const multi = new TextFormatter().formatTranscripts([REF, REF]);
    expect(multi.split('\n\n\n')).toHaveLength(2);
  });
});

describe('JSONFormatter', () => {
  it('serializes raw data', () => {
    const out = new JSONFormatter().formatTranscript(REF);
    expect(JSON.parse(out)).toEqual([
      { text: 'Hey, this is just a test', start: 0, duration: 1.54 },
      { text: 'this is not the original transcript', start: 1.54, duration: 4.16 },
      {
        text: 'just something shorter, I made up for testing',
        start: 5.7,
        duration: 3.239,
      },
    ]);
  });
});

describe('PrettyPrintFormatter', () => {
  it('returns indented JSON', () => {
    const out = new PrettyPrintFormatter().formatTranscript(REF);
    expect(out).toContain('\n  {\n');
  });
});

describe('SRTFormatter', () => {
  it('formats with comma-separated milliseconds and indexed entries', () => {
    const out = new SRTFormatter().formatTranscript(REF);
    expect(out).toContain('1\n00:00:00,000 --> 00:00:01,540\nHey, this is just a test');
    expect(out).toContain('2\n00:00:01,540 --> 00:00:05,700');
    // Trailing newline
    expect(out.endsWith('\n')).toBe(true);
  });
});

describe('WebVTTFormatter', () => {
  it('starts with WEBVTT header and uses dot-separated milliseconds', () => {
    const out = new WebVTTFormatter().formatTranscript(REF);
    expect(out.startsWith('WEBVTT\n\n')).toBe(true);
    expect(out).toContain('00:00:00.000 --> 00:00:01.540\nHey, this is just a test');
  });
});

describe('FormatterLoader', () => {
  it('loads each known formatter type', () => {
    const loader = new FormatterLoader();
    expect(loader.load('json')).toBeInstanceOf(JSONFormatter);
    expect(loader.load('text')).toBeInstanceOf(TextFormatter);
    expect(loader.load('pretty')).toBeInstanceOf(PrettyPrintFormatter);
    expect(loader.load('srt')).toBeInstanceOf(SRTFormatter);
    expect(loader.load('webvtt')).toBeInstanceOf(WebVTTFormatter);
  });

  it('throws UnknownFormatterType for unknown formats', () => {
    expect(() => new FormatterLoader().load('xml')).toThrow(UnknownFormatterType);
  });
});
