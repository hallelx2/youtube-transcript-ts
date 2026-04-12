import type { Formatter } from './base.js';
import { JSONFormatter } from './jsonFormatter.js';
import { PrettyPrintFormatter } from './prettyPrintFormatter.js';
import { SRTFormatter } from './srtFormatter.js';
import { TextFormatter } from './textFormatter.js';
import { WebVTTFormatter } from './webvttFormatter.js';

export { Formatter } from './base.js';
export { JSONFormatter, type JsonFormatterOptions } from './jsonFormatter.js';
export { PrettyPrintFormatter } from './prettyPrintFormatter.js';
export { SRTFormatter } from './srtFormatter.js';
export { TextFormatter } from './textFormatter.js';
export { WebVTTFormatter } from './webvttFormatter.js';
export { TextBasedFormatter } from './textBasedFormatter.js';

export type FormatterType = 'json' | 'pretty' | 'text' | 'webvtt' | 'srt';

const TYPES: Record<FormatterType, new () => Formatter> = {
  json: JSONFormatter,
  pretty: PrettyPrintFormatter,
  text: TextFormatter,
  webvtt: WebVTTFormatter,
  srt: SRTFormatter,
};

export class UnknownFormatterType extends Error {
  constructor(formatterType: string) {
    super(
      `The format '${formatterType}' is not supported. ` +
        `Choose one of the following formats: ${Object.keys(TYPES).join(', ')}`,
    );
    this.name = 'UnknownFormatterType';
  }
}

export class FormatterLoader {
  static readonly TYPES = TYPES;

  load(formatterType: FormatterType | string = 'pretty'): Formatter {
    if (!(formatterType in TYPES)) {
      throw new UnknownFormatterType(formatterType);
    }
    const Cls = TYPES[formatterType as FormatterType];
    return new Cls();
  }
}
