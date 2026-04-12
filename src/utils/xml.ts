export interface RawTranscriptElement {
  text: string;
  attrs: Record<string, string>;
}

const TEXT_ELEMENT_REGEX = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
const ATTR_REGEX = /([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;

export function parseTranscriptXml(raw: string): RawTranscriptElement[] {
  const out: RawTranscriptElement[] = [];
  TEXT_ELEMENT_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TEXT_ELEMENT_REGEX.exec(raw)) !== null) {
    const attrString = match[1] ?? '';
    const innerText = match[2] ?? '';
    const attrs: Record<string, string> = {};
    ATTR_REGEX.lastIndex = 0;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = ATTR_REGEX.exec(attrString)) !== null) {
      const key = attrMatch[1];
      const value = attrMatch[2];
      if (key !== undefined && value !== undefined) {
        attrs[key] = value;
      }
    }
    out.push({ text: innerText, attrs });
  }
  return out;
}
