import { watchUrl } from '../settings.js';

export class YouTubeTranscriptApiException extends Error {
  constructor(message?: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CookieError extends YouTubeTranscriptApiException {}

export class CookiePathInvalid extends CookieError {
  constructor(cookiePath: string) {
    super(`Can't load the provided cookie file: ${cookiePath}`);
  }
}

export class CookieInvalid extends CookieError {
  constructor(cookiePath: string) {
    super(
      `The cookies provided are not valid (may have expired): ${cookiePath}`,
    );
  }
}

const ERROR_MESSAGE_TEMPLATE =
  '\nCould not retrieve a transcript for the video {video_url}!';
const CAUSE_MESSAGE_INTRO = ' This is most likely caused by:\n\n{cause}';
const GITHUB_REFERRAL =
  '\n\nIf you are sure that the described cause is not responsible for this error ' +
  'and that a transcript should be retrievable, please create an issue at ' +
  'https://github.com/jdepoix/youtube-transcript-api/issues. ' +
  'Please add which version of youtube_transcript_api you are using ' +
  'and provide the information needed to replicate the error. ' +
  'Also make sure that there are no open issues which already describe your problem!';

export class CouldNotRetrieveTranscript extends YouTubeTranscriptApiException {
  readonly videoId: string;
  protected static CAUSE_MESSAGE = '';

  constructor(videoId: string) {
    super('');
    this.videoId = videoId;
    this.message = this.buildErrorMessage();
  }

  protected buildErrorMessage(): string {
    let errorMessage = ERROR_MESSAGE_TEMPLATE.replace(
      '{video_url}',
      watchUrl(this.videoId),
    );
    const cause = this.cause;
    if (cause) {
      errorMessage += CAUSE_MESSAGE_INTRO.replace('{cause}', cause) + GITHUB_REFERRAL;
    }
    return errorMessage;
  }

  override get cause(): string {
    return (this.constructor as typeof CouldNotRetrieveTranscript).CAUSE_MESSAGE;
  }

  override toString(): string {
    return this.buildErrorMessage();
  }
}

export class YouTubeDataUnparsable extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'The data required to fetch the transcript is not parsable. This should ' +
    'not happen, please open an issue (make sure to include the video ID)!';
}

export class YouTubeRequestFailed extends CouldNotRetrieveTranscript {
  reason: string = '';
  protected static override CAUSE_MESSAGE = 'Request to YouTube failed: {reason}';

  constructor(videoId: string, httpError: Error | string) {
    super(videoId);
    this.reason = typeof httpError === 'string' ? httpError : String(httpError);
    this.message = this.buildErrorMessage();
  }

  override get cause(): string {
    if (!this.reason) return '';
    return (
      this.constructor as typeof YouTubeRequestFailed
    ).CAUSE_MESSAGE.replace('{reason}', this.reason);
  }
}

export class VideoUnplayable extends CouldNotRetrieveTranscript {
  reason: string | null = null;
  subReasons: string[] = [];
  protected static override CAUSE_MESSAGE =
    'The video is unplayable for the following reason: {reason}';
  protected static SUBREASON_MESSAGE = '\n\nAdditional Details:\n{sub_reasons}';

  private _initialized = false;

  constructor(videoId: string, reason: string | null, subReasons: string[]) {
    super(videoId);
    this.reason = reason;
    this.subReasons = subReasons;
    this._initialized = true;
    this.message = this.buildErrorMessage();
  }

  override get cause(): string {
    if (!this._initialized) return '';
    let reason = this.reason === null ? 'No reason specified!' : this.reason;
    if (this.subReasons.length > 0) {
      const subReasons = this.subReasons.map((s) => ` - ${s}`).join('\n');
      reason =
        reason +
        VideoUnplayable.SUBREASON_MESSAGE.replace('{sub_reasons}', subReasons);
    }
    return (this.constructor as typeof VideoUnplayable).CAUSE_MESSAGE.replace(
      '{reason}',
      reason,
    );
  }
}

export class VideoUnavailable extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE = 'The video is no longer available';
}

export class InvalidVideoId extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'You provided an invalid video id. Make sure you are using the video id and NOT the url!\n\n' +
    'Do NOT run: `YouTubeTranscriptApi().fetch("https://www.youtube.com/watch?v=1234")`\n' +
    'Instead run: `YouTubeTranscriptApi().fetch("1234")`';
}

const REQUEST_BLOCKED_BASE_CAUSE_MESSAGE =
  'YouTube is blocking requests from your IP. This usually is due to one of the ' +
  'following reasons:\n' +
  '- You have done too many requests and your IP has been blocked by YouTube\n' +
  '- You are doing requests from an IP belonging to a cloud provider (like AWS, ' +
  'Google Cloud Platform, Azure, etc.). Unfortunately, most IPs from cloud ' +
  'providers are blocked by YouTube.\n\n';

export class RequestBlocked extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    REQUEST_BLOCKED_BASE_CAUSE_MESSAGE +
    'There are two things you can do to work around this:\n' +
    '1. Use proxies to hide your IP address, as explained in the "Working around ' +
    'IP bans" section of the README ' +
    '(https://github.com/jdepoix/youtube-transcript-api' +
    '?tab=readme-ov-file' +
    '#working-around-ip-bans-requestblocked-or-ipblocked-exception).\n' +
    '2. (NOT RECOMMENDED) If you authenticate your requests using cookies, you ' +
    'will be able to continue doing requests for a while. However, YouTube will ' +
    'eventually permanently ban the account that you have used to authenticate ' +
    "with! So only do this if you don't mind your account being banned!";

  protected static WITH_GENERIC_PROXY_CAUSE_MESSAGE =
    'YouTube is blocking your requests, despite you using proxies. Keep in mind ' +
    'that a proxy is just a way to hide your real IP behind the IP of that proxy, ' +
    "but there is no guarantee that the IP of that proxy won't be blocked as " +
    'well.\n\n' +
    'The only truly reliable way to prevent IP blocks is rotating through a large ' +
    'pool of residential IPs, by using a provider like Webshare ' +
    '(https://www.webshare.io/?referral_code=w0xno53eb50g), which provides you ' +
    'with a pool of >30M residential IPs (make sure to purchase ' +
    '"Residential" proxies, NOT "Proxy Server" or "Static Residential"!).\n\n' +
    'You will find more information on how to easily integrate Webshare here: ' +
    'https://github.com/jdepoix/youtube-transcript-api' +
    '?tab=readme-ov-file#using-webshare';

  protected static WITH_WEBSHARE_PROXY_CAUSE_MESSAGE =
    'YouTube is blocking your requests, despite you using Webshare proxies. ' +
    'Please make sure that you have purchased "Residential" proxies and ' +
    'NOT "Proxy Server" or "Static Residential", as those won\'t work as ' +
    'reliably! The free tier also uses "Proxy Server" and will NOT work!\n\n' +
    'The only reliable option is using "Residential" proxies (not "Static ' +
    'Residential"), as this allows you to rotate through a pool of over 30M IPs, ' +
    "which means you will always find an IP that hasn't been blocked by YouTube " +
    'yet!\n\n' +
    'You can support the development of this open source project by making your ' +
    'Webshare purchases through this affiliate link: ' +
    'https://www.webshare.io/?referral_code=w0xno53eb50g \n\n' +
    'Thank you for your support! <3';

  private _proxyConfig: { constructor?: { name?: string } } | null = null;

  withProxyConfig(proxyConfig: object | null | undefined): this {
    this._proxyConfig =
      (proxyConfig as { constructor?: { name?: string } } | null | undefined) ??
      null;
    this.message = this.buildErrorMessage();
    return this;
  }

  override get cause(): string {
    if (this._proxyConfig !== null && this._proxyConfig !== undefined) {
      const name = this._proxyConfig.constructor?.name ?? '';
      if (name === 'WebshareProxyConfig') {
        return RequestBlocked.WITH_WEBSHARE_PROXY_CAUSE_MESSAGE;
      }
      if (name) {
        return RequestBlocked.WITH_GENERIC_PROXY_CAUSE_MESSAGE;
      }
    }
    return (this.constructor as typeof RequestBlocked).CAUSE_MESSAGE;
  }
}

export class IpBlocked extends RequestBlocked {
  protected static override CAUSE_MESSAGE =
    REQUEST_BLOCKED_BASE_CAUSE_MESSAGE +
    'Ways to work around this are explained in the "Working around IP ' +
    'bans" section of the README (https://github.com/jdepoix/youtube-transcript-api' +
    '?tab=readme-ov-file' +
    '#working-around-ip-bans-requestblocked-or-ipblocked-exception).\n';
}

export class TranscriptsDisabled extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE = 'Subtitles are disabled for this video';
}

export class AgeRestricted extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'This video is age-restricted. Therefore, you are unable to retrieve ' +
    'transcripts for it without authenticating yourself.\n\n' +
    'Unfortunately, Cookie Authentication is temporarily unsupported in ' +
    "youtube-transcript-api, as recent changes in YouTube's API broke the previous " +
    'implementation. I will do my best to re-implement it as soon as possible.';
}

export class NotTranslatable extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'The requested language is not translatable';
}

export class TranslationLanguageNotAvailable extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'The requested translation language is not available';
}

export class FailedToCreateConsentCookie extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'Failed to automatically give consent to saving cookies';
}

export class NoTranscriptFound extends CouldNotRetrieveTranscript {
  private _requestedLanguageCodes: readonly string[] = [];
  private _transcriptData: { toString(): string } = { toString: () => '' };
  private _initialized = false;
  protected static override CAUSE_MESSAGE =
    'No transcripts were found for any of the requested language codes: {requested_language_codes}\n\n' +
    '{transcript_data}';

  constructor(
    videoId: string,
    requestedLanguageCodes: Iterable<string>,
    transcriptData: { toString(): string },
  ) {
    super(videoId);
    this._requestedLanguageCodes = Array.from(requestedLanguageCodes);
    this._transcriptData = transcriptData;
    this._initialized = true;
    this.message = this.buildErrorMessage();
  }

  override get cause(): string {
    if (!this._initialized) return '';
    const langs = `[${this._requestedLanguageCodes
      .map((c) => `'${c}'`)
      .join(', ')}]`;
    return (this.constructor as typeof NoTranscriptFound).CAUSE_MESSAGE.replace(
      '{requested_language_codes}',
      langs,
    ).replace('{transcript_data}', String(this._transcriptData));
  }
}

export class PoTokenRequired extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'The requested video cannot be retrieved without a PO Token. If this happens, ' +
    'please open a GitHub issue!';
}
