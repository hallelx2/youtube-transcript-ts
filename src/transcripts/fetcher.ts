import {
  AgeRestricted,
  FailedToCreateConsentCookie,
  InvalidVideoId,
  IpBlocked,
  RequestBlocked,
  TranscriptsDisabled,
  VideoUnavailable,
  VideoUnplayable,
  YouTubeDataUnparsable,
  YouTubeRequestFailed,
} from '../errors/index.js';
import type { ProxyConfig } from '../proxies/proxyConfig.js';
import { innertubeApiUrl, INNERTUBE_CONTEXT, watchUrl } from '../settings.js';
import { decodeHtmlEntities } from '../utils/htmlEntities.js';
import type { HttpClient } from '../utils/httpClient.js';
import { TranscriptList, type CaptionsJson } from './transcriptList.js';

const PLAYABILITY_STATUS_OK = 'OK';
const PLAYABILITY_STATUS_ERROR = 'ERROR';
const PLAYABILITY_STATUS_LOGIN_REQUIRED = 'LOGIN_REQUIRED';

// NOTE: byte-identical to Python source — uses U+2019 right single quotation mark.
const REASON_BOT_DETECTED = 'Sign in to confirm you\u2019re not a bot';
const REASON_AGE_RESTRICTED = 'This video may be inappropriate for some users.';
const REASON_VIDEO_UNAVAILABLE = 'This video is unavailable';

const INNERTUBE_API_KEY_REGEX = /"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/;
const CONSENT_COOKIE_REGEX = /name="v" value="(.*?)"/;
const CONSENT_FORM_MARKER = 'action="https://consent.youtube.com/s"';
const RECAPTCHA_MARKER = 'class="g-recaptcha"';

interface PlayabilityStatusData {
  status?: string;
  reason?: string;
  errorScreen?: {
    playerErrorMessageRenderer?: {
      subreason?: {
        runs?: Array<{ text?: string }>;
      };
    };
  };
}

interface InnertubeData {
  playabilityStatus?: PlayabilityStatusData;
  captions?: {
    playerCaptionsTracklistRenderer?: CaptionsJson;
  };
}

async function raiseHttpErrors(
  response: Response,
  videoId: string,
): Promise<Response> {
  if (response.status === 429) {
    throw new IpBlocked(videoId);
  }
  if (!response.ok) {
    throw new YouTubeRequestFailed(
      videoId,
      `${response.status} ${response.statusText || 'HTTP error'}`,
    );
  }
  return response;
}

export class TranscriptListFetcher {
  private readonly _httpClient: HttpClient;
  private readonly _proxyConfig: ProxyConfig | undefined;

  constructor(httpClient: HttpClient, proxyConfig: ProxyConfig | undefined) {
    this._httpClient = httpClient;
    this._proxyConfig = proxyConfig;
  }

  async fetch(videoId: string): Promise<TranscriptList> {
    const captionsJson = await this._fetchCaptionsJson(videoId, 0);
    return TranscriptList.build(this._httpClient, videoId, captionsJson);
  }

  private async _fetchCaptionsJson(
    videoId: string,
    tryNumber: number,
  ): Promise<CaptionsJson> {
    try {
      const html = await this._fetchVideoHtml(videoId);
      const apiKey = this._extractInnertubeApiKey(html, videoId);
      const innertubeData = await this._fetchInnertubeData(videoId, apiKey);
      return this._extractCaptionsJson(innertubeData, videoId);
    } catch (err) {
      if (err instanceof RequestBlocked) {
        const retries = this._proxyConfig?.retriesWhenBlocked ?? 0;
        if (tryNumber + 1 < retries) {
          return this._fetchCaptionsJson(videoId, tryNumber + 1);
        }
        throw err.withProxyConfig(this._proxyConfig ?? null);
      }
      throw err;
    }
  }

  private _extractInnertubeApiKey(html: string, videoId: string): string {
    const match = INNERTUBE_API_KEY_REGEX.exec(html);
    if (match && match[1]) {
      return match[1];
    }
    if (html.includes(RECAPTCHA_MARKER)) {
      throw new IpBlocked(videoId);
    }
    throw new YouTubeDataUnparsable(videoId);
  }

  private _extractCaptionsJson(
    innertubeData: InnertubeData,
    videoId: string,
  ): CaptionsJson {
    this._assertPlayability(innertubeData.playabilityStatus, videoId);
    const captionsJson =
      innertubeData.captions?.playerCaptionsTracklistRenderer;
    if (!captionsJson || !captionsJson.captionTracks) {
      throw new TranscriptsDisabled(videoId);
    }
    return captionsJson;
  }

  private _assertPlayability(
    playabilityStatusData: PlayabilityStatusData | undefined,
    videoId: string,
  ): void {
    if (!playabilityStatusData) return;
    const status = playabilityStatusData.status;
    if (!status || status === PLAYABILITY_STATUS_OK) return;
    const reason = playabilityStatusData.reason;
    if (status === PLAYABILITY_STATUS_LOGIN_REQUIRED) {
      if (reason === REASON_BOT_DETECTED) {
        throw new RequestBlocked(videoId);
      }
      if (reason === REASON_AGE_RESTRICTED) {
        throw new AgeRestricted(videoId);
      }
    }
    if (
      status === PLAYABILITY_STATUS_ERROR &&
      reason === REASON_VIDEO_UNAVAILABLE
    ) {
      if (videoId.startsWith('http://') || videoId.startsWith('https://')) {
        throw new InvalidVideoId(videoId);
      }
      throw new VideoUnavailable(videoId);
    }
    const subreasons =
      playabilityStatusData.errorScreen?.playerErrorMessageRenderer?.subreason
        ?.runs ?? [];
    throw new VideoUnplayable(
      videoId,
      reason ?? null,
      subreasons.map((r) => r.text ?? ''),
    );
  }

  private _createConsentCookie(html: string, videoId: string): void {
    const match = CONSENT_COOKIE_REGEX.exec(html);
    if (!match || !match[1]) {
      throw new FailedToCreateConsentCookie(videoId);
    }
    this._httpClient.setCookie('CONSENT', `YES+${match[1]}`, '.youtube.com');
  }

  private async _fetchVideoHtml(videoId: string): Promise<string> {
    let html = await this._fetchHtml(videoId);
    if (html.includes(CONSENT_FORM_MARKER)) {
      this._createConsentCookie(html, videoId);
      html = await this._fetchHtml(videoId);
      if (html.includes(CONSENT_FORM_MARKER)) {
        throw new FailedToCreateConsentCookie(videoId);
      }
    }
    return html;
  }

  private async _fetchHtml(videoId: string): Promise<string> {
    const response = await this._httpClient.get(watchUrl(videoId));
    const checked = await raiseHttpErrors(response, videoId);
    const text = await checked.text();
    return decodeHtmlEntities(text);
  }

  private async _fetchInnertubeData(
    videoId: string,
    apiKey: string,
  ): Promise<InnertubeData> {
    const response = await this._httpClient.post(innertubeApiUrl(apiKey), {
      context: INNERTUBE_CONTEXT,
      videoId,
    });
    const checked = await raiseHttpErrors(response, videoId);
    return (await checked.json()) as InnertubeData;
  }
}
