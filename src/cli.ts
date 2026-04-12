import { YouTubeTranscriptApi } from './api.js';
import { FormatterLoader, type FormatterType } from './formatters/index.js';
import { GenericProxyConfig } from './proxies/genericProxyConfig.js';
import type { ProxyConfig } from './proxies/proxyConfig.js';
import { WebshareProxyConfig } from './proxies/webshareProxyConfig.js';
import type { FetchedTranscript } from './transcripts/fetchedTranscript.js';
import type { TranscriptList } from './transcripts/transcriptList.js';
import { ArgvError, parseArgs } from './utils/argv.js';

const VERSION = '0.1.0';

const SPEC = {
  list_transcripts: { kind: 'boolean' as const, default: false },
  languages: { kind: 'string[]' as const, default: ['en'] },
  exclude_generated: { kind: 'boolean' as const, default: false },
  exclude_manually_created: { kind: 'boolean' as const, default: false },
  format: { kind: 'string' as const, default: 'pretty' },
  translate: { kind: 'string' as const, default: '' },
  webshare_proxy_username: { kind: 'string' as const, default: '' },
  webshare_proxy_password: { kind: 'string' as const, default: '' },
  http_proxy: { kind: 'string' as const, default: '' },
  https_proxy: { kind: 'string' as const, default: '' },
  version: { kind: 'boolean' as const, default: false },
  help: { kind: 'boolean' as const, default: false },
};

const HELP_TEXT = `Usage: youtube-transcript [options] VIDEO_ID [VIDEO_ID ...]

Fetch transcripts/subtitles for one or more YouTube videos.

Options:
  --list-transcripts             List available transcript languages instead of fetching.
  --languages CODE [CODE ...]    Language codes in descending priority (default: en).
  --exclude-generated            Skip auto-generated transcripts.
  --exclude-manually-created     Skip manually created transcripts.
  --format FORMAT                Output format: json, pretty, text, webvtt, srt (default: pretty).
  --translate CODE               Translate to the given language code.
  --webshare-proxy-username U    Webshare "Proxy Username".
  --webshare-proxy-password P    Webshare "Proxy Password".
  --http-proxy URL               HTTP proxy URL.
  --https-proxy URL              HTTPS proxy URL.
  --version                      Print version and exit.
  --help                         Show this help message and exit.
`;

export class YouTubeTranscriptCli {
  private readonly _argv: string[];

  constructor(argv: string[]) {
    this._argv = argv;
  }

  async run(): Promise<{ output: string; exitCode: number }> {
    let parsed;
    try {
      parsed = parseArgs(this._argv, SPEC);
    } catch (err) {
      if (err instanceof ArgvError) {
        return { output: err.message, exitCode: 2 };
      }
      throw err;
    }
    const flags = parsed.flags;

    if (flags['help'] === true) {
      return { output: HELP_TEXT, exitCode: 0 };
    }
    if (flags['version'] === true) {
      return { output: `youtube-transcript, version ${VERSION}`, exitCode: 0 };
    }

    if (parsed.positional.length === 0) {
      return {
        output: 'error: at least one VIDEO_ID is required\n\n' + HELP_TEXT,
        exitCode: 2,
      };
    }

    const videoIds = parsed.positional.map((id) => id.replace(/\\/g, ''));

    const excludeManually = flags['exclude_manually_created'] === true;
    const excludeGenerated = flags['exclude_generated'] === true;
    if (excludeManually && excludeGenerated) {
      return { output: '', exitCode: 0 };
    }

    let proxyConfig: ProxyConfig | undefined;
    const httpProxy = flags['http_proxy'] as string;
    const httpsProxy = flags['https_proxy'] as string;
    if (httpProxy !== '' || httpsProxy !== '') {
      proxyConfig = new GenericProxyConfig({
        httpUrl: httpProxy || undefined,
        httpsUrl: httpsProxy || undefined,
      });
    }

    const wsUser = flags['webshare_proxy_username'] as string;
    const wsPass = flags['webshare_proxy_password'] as string;
    if (wsUser !== '' || wsPass !== '') {
      proxyConfig = new WebshareProxyConfig({
        proxyUsername: wsUser,
        proxyPassword: wsPass,
      });
    }

    const api = new YouTubeTranscriptApi({ proxyConfig });

    const collected: Array<TranscriptList | FetchedTranscript> = [];
    const exceptions: string[] = [];
    let successCount = 0;

    for (const videoId of videoIds) {
      try {
        const list = await api.list(videoId);
        if (flags['list_transcripts'] === true) {
          collected.push(list);
        } else {
          const fetched = await this._fetchTranscript(
            list,
            flags['languages'] as string[],
            excludeManually,
            excludeGenerated,
            flags['translate'] as string,
          );
          collected.push(fetched);
        }
        successCount++;
      } catch (err) {
        exceptions.push(err instanceof Error ? err.toString() : String(err));
      }
    }

    const printSections: string[] = [...exceptions];
    if (collected.length > 0) {
      if (flags['list_transcripts'] === true) {
        for (const item of collected) {
          printSections.push(String(item));
        }
      } else {
        const formatter = new FormatterLoader().load(flags['format'] as FormatterType);
        printSections.push(
          formatter.formatTranscripts(collected as FetchedTranscript[]),
        );
      }
    }

    const output = printSections.join('\n\n');
    const exitCode = successCount === 0 && videoIds.length > 0 ? 1 : 0;
    return { output, exitCode };
  }

  private async _fetchTranscript(
    transcriptList: TranscriptList,
    languages: string[],
    excludeManually: boolean,
    excludeGenerated: boolean,
    translate: string,
  ): Promise<FetchedTranscript> {
    let transcript;
    if (excludeManually) {
      transcript = transcriptList.findGeneratedTranscript(languages);
    } else if (excludeGenerated) {
      transcript = transcriptList.findManuallyCreatedTranscript(languages);
    } else {
      transcript = transcriptList.findTranscript(languages);
    }
    if (translate !== '') {
      transcript = transcript.translate(translate);
    }
    return transcript.fetch();
  }
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const cli = new YouTubeTranscriptCli(argv);
  const { output, exitCode } = await cli.run();
  if (output) {
    process.stdout.write(output + '\n');
  }
  process.exit(exitCode);
}

// Auto-run when executed directly (works under both ESM and CJS).
const isDirectRun = (() => {
  try {
    if (typeof process === 'undefined' || !process.argv[1]) return false;
    const entry = process.argv[1];
    return entry.endsWith('cli.js') || entry.endsWith('cli.cjs');
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  void main();
}
