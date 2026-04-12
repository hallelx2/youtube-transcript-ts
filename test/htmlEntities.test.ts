import { describe, expect, it } from 'vitest';
import { decodeHtmlEntities } from '../src/utils/htmlEntities.js';

describe('decodeHtmlEntities', () => {
  it('decodes named entities', () => {
    expect(decodeHtmlEntities('a &amp; b')).toBe('a & b');
    expect(decodeHtmlEntities('&lt;i&gt;')).toBe('<i>');
    expect(decodeHtmlEntities('&quot;hi&quot;')).toBe('"hi"');
    expect(decodeHtmlEntities('it&apos;s')).toBe("it's");
  });

  it('decodes decimal numeric entities', () => {
    expect(decodeHtmlEntities('it&#39;s')).toBe("it's");
    expect(decodeHtmlEntities('&#65;')).toBe('A');
  });

  it('decodes hex numeric entities', () => {
    expect(decodeHtmlEntities('&#x27;')).toBe("'");
    expect(decodeHtmlEntities('&#x41;')).toBe('A');
  });

  it('passes through unknown entities verbatim', () => {
    expect(decodeHtmlEntities('&unknownent;')).toBe('&unknownent;');
  });

  it('handles strings with no entities', () => {
    expect(decodeHtmlEntities('plain text')).toBe('plain text');
    expect(decodeHtmlEntities('')).toBe('');
  });

  it('handles strings with mixed content', () => {
    expect(decodeHtmlEntities('this is &lt;i&gt;not&lt;/i&gt; the original')).toBe(
      'this is <i>not</i> the original',
    );
  });
});
