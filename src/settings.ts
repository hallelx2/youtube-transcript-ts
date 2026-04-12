export const WATCH_URL_TEMPLATE = 'https://www.youtube.com/watch?v={video_id}';
export const INNERTUBE_API_URL_TEMPLATE =
  'https://www.youtube.com/youtubei/v1/player?key={api_key}';

export const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'ANDROID',
    clientVersion: '20.10.38',
  },
} as const;

export function watchUrl(videoId: string): string {
  return WATCH_URL_TEMPLATE.replace('{video_id}', videoId);
}

export function innertubeApiUrl(apiKey: string): string {
  return INNERTUBE_API_URL_TEMPLATE.replace('{api_key}', apiKey);
}
