import { decodeHtmlEntities } from '../utils/htmlEntities.js';
import { parseTranscriptXml } from '../utils/xml.js';
import type { FetchedTranscriptSnippet } from './fetchedTranscript.js';

const FORMATTING_TAGS = [
  'strong',
  'em',
  'b',
  'i',
  'mark',
  'small',
  'del',
  'ins',
  'sub',
  'sup',
];

const STRIP_ALL_REGEX = /<[^>]*>/gi;

function buildPreserveRegex(): RegExp {
  const formats = FORMATTING_TAGS.join('|');
  return new RegExp(`<\\/?(?!\\/?(${formats})\\b).*?\\b>`, 'gi');
}

export class TranscriptParser {
  private readonly _htmlRegex: RegExp;

  constructor(preserveFormatting: boolean = false) {
    this._htmlRegex = preserveFormatting ? buildPreserveRegex() : STRIP_ALL_REGEX;
  }

  parse(rawData: string): FetchedTranscriptSnippet[] {
    const elements = parseTranscriptXml(rawData);
    const out: FetchedTranscriptSnippet[] = [];
    for (const el of elements) {
      // Skip empty <text></text> elements (matches Python ElementTree behaviour
      // where xml_element.text is None for empty elements).
      if (el.text === '') continue;
      // Two decoding passes to mirror Python: defusedxml.ElementTree decodes
      // XML entities once when parsing, then html.unescape decodes the inner
      // HTML entities. YouTube double-escapes content (e.g. "&amp;#39;" for an
      // apostrophe), so a single pass would leave "&#39;" in the output.
      const xmlDecoded = decodeHtmlEntities(el.text);
      const htmlDecoded = decodeHtmlEntities(xmlDecoded);
      // Reset lastIndex because we share a global regex across calls.
      this._htmlRegex.lastIndex = 0;
      const stripped = htmlDecoded.replace(this._htmlRegex, '');
      const startAttr = el.attrs['start'] ?? '0';
      const durAttr = el.attrs['dur'] ?? '0.0';
      out.push({
        text: stripped,
        start: Number.parseFloat(startAttr),
        duration: Number.parseFloat(durAttr),
      });
    }
    return out;
  }
}
