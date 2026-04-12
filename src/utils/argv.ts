export type FlagKind = 'boolean' | 'string' | 'string[]';

export interface FlagSpec {
  kind: FlagKind;
  default?: boolean | string | string[];
}

export type ArgvSpec = Record<string, FlagSpec>;

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, boolean | string | string[]>;
}

export class ArgvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgvError';
  }
}

export function parseArgs(argv: string[], spec: ArgvSpec): ParsedArgs {
  const flags: Record<string, boolean | string | string[]> = {};
  const positional: string[] = [];

  for (const [name, def] of Object.entries(spec)) {
    if (def.default !== undefined) {
      flags[name] = def.default;
    } else if (def.kind === 'boolean') {
      flags[name] = false;
    } else if (def.kind === 'string[]') {
      flags[name] = [];
    }
  }

  const known = new Set(Object.keys(spec));
  let i = 0;
  let stopFlags = false;

  while (i < argv.length) {
    const token = argv[i]!;
    if (stopFlags) {
      positional.push(token);
      i++;
      continue;
    }
    if (token === '--') {
      stopFlags = true;
      i++;
      continue;
    }
    if (token.startsWith('--')) {
      const eqIdx = token.indexOf('=');
      const rawName = eqIdx === -1 ? token.slice(2) : token.slice(2, eqIdx);
      const inlineValue = eqIdx === -1 ? undefined : token.slice(eqIdx + 1);
      const name = rawName.replace(/-/g, '_');
      if (!known.has(name)) {
        throw new ArgvError(`Unknown argument: --${rawName}`);
      }
      const def = spec[name]!;
      if (def.kind === 'boolean') {
        if (inlineValue !== undefined) {
          throw new ArgvError(`Argument --${rawName} does not take a value`);
        }
        flags[name] = true;
        i++;
      } else if (def.kind === 'string') {
        if (inlineValue !== undefined) {
          flags[name] = inlineValue;
          i++;
        } else {
          const next = argv[i + 1];
          if (next === undefined) {
            throw new ArgvError(`Argument --${rawName} requires a value`);
          }
          flags[name] = next;
          i += 2;
        }
      } else {
        // string[]
        const collected: string[] = [];
        if (inlineValue !== undefined) {
          collected.push(inlineValue);
          i++;
        } else {
          i++;
        }
        while (i < argv.length) {
          const peek = argv[i]!;
          if (peek === '--' || peek.startsWith('--')) break;
          collected.push(peek);
          i++;
        }
        flags[name] = collected;
      }
    } else {
      positional.push(token);
      i++;
    }
  }

  return { positional, flags };
}
