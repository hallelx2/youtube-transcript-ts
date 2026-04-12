import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTranscriptXml } from '../src/utils/xml.js';

const FIXTURE = readFileSync(
  fileURLToPath(new URL('./assets/transcript.xml.static', import.meta.url)),
  'utf8',
);

describe('parseTranscriptXml', () => {
  it('extracts all <text> elements including empty ones', () => {
    const elements = parseTranscriptXml(FIXTURE);
    expect(elements).toHaveLength(4);
  });

  it('preserves attribute order and values', () => {
    const elements = parseTranscriptXml(FIXTURE);
    expect(elements[0]?.attrs).toEqual({ start: '0', dur: '1.54' });
    expect(elements[1]?.attrs).toEqual({ start: '1.54', dur: '4.16' });
    expect(elements[2]?.attrs).toEqual({ start: '5', dur: '0.5' });
    expect(elements[3]?.attrs).toEqual({ start: '5.7', dur: '3.239' });
  });

  it('returns raw inner text without entity decoding', () => {
    const elements = parseTranscriptXml(FIXTURE);
    expect(elements[0]?.text).toBe('Hey, this is just a test');
    expect(elements[1]?.text).toBe('this is &lt;i>not&lt;/i> the original transcript');
    expect(elements[2]?.text).toBe('');
    expect(elements[3]?.text).toBe('just something shorter, I made up for testing');
  });

  it('returns an empty array for input with no <text> elements', () => {
    expect(parseTranscriptXml('<transcript></transcript>')).toEqual([]);
  });
});
