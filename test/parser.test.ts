import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TranscriptParser } from '../src/transcripts/parser.js';

const FIXTURE = readFileSync(
  fileURLToPath(new URL('./assets/transcript.xml.static', import.meta.url)),
  'utf8',
);

describe('TranscriptParser', () => {
  it('produces the reference 3-snippet output (default, formatting stripped)', () => {
    const snippets = new TranscriptParser(false).parse(FIXTURE);
    expect(snippets).toEqual([
      { text: 'Hey, this is just a test', start: 0, duration: 1.54 },
      { text: 'this is not the original transcript', start: 1.54, duration: 4.16 },
      {
        text: 'just something shorter, I made up for testing',
        start: 5.7,
        duration: 3.239,
      },
    ]);
  });

  it('preserves formatting tags when preserveFormatting=true', () => {
    const snippets = new TranscriptParser(true).parse(FIXTURE);
    expect(snippets[1]?.text).toBe('this is <i>not</i> the original transcript');
  });

  it('skips empty <text></text> elements', () => {
    const snippets = new TranscriptParser(false).parse(FIXTURE);
    expect(snippets).toHaveLength(3);
    expect(snippets.find((s) => s.start === 5)).toBeUndefined();
  });

  it('decodes double-escaped entities (YouTube uses &amp;#39; for apostrophe)', () => {
    // YouTube wraps the inner HTML entity in another XML escape, so the raw
    // XML body contains "&amp;#39;" which after one XML decode becomes
    // "&#39;" and only after a second html.unescape becomes "'". The Python
    // upstream relies on ElementTree + html.unescape to do this; we mirror it
    // with two decodeHtmlEntities passes inside the parser.
    const xml =
      '<?xml version="1.0"?><transcript>' +
      '<text start="0" dur="1">we&amp;#39;ll do it</text>' +
      '</transcript>';
    const snippets = new TranscriptParser(false).parse(xml);
    expect(snippets[0]?.text).toBe("we'll do it");
  });
});
