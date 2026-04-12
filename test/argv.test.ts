import { describe, expect, it } from 'vitest';
import { ArgvError, parseArgs } from '../src/utils/argv.js';

const SPEC = {
  flag: { kind: 'boolean' as const, default: false },
  name: { kind: 'string' as const, default: '' },
  langs: { kind: 'string[]' as const, default: ['en'] },
};

describe('parseArgs', () => {
  it('parses positional arguments', () => {
    const out = parseArgs(['a', 'b', 'c'], SPEC);
    expect(out.positional).toEqual(['a', 'b', 'c']);
    expect(out.flags['flag']).toBe(false);
    expect(out.flags['langs']).toEqual(['en']);
  });

  it('parses boolean flags', () => {
    const out = parseArgs(['--flag', 'video1'], SPEC);
    expect(out.flags['flag']).toBe(true);
    expect(out.positional).toEqual(['video1']);
  });

  it('parses string flags with space-separated value', () => {
    const out = parseArgs(['--name', 'alice'], SPEC);
    expect(out.flags['name']).toBe('alice');
  });

  it('parses string flags with = syntax', () => {
    const out = parseArgs(['--name=alice'], SPEC);
    expect(out.flags['name']).toBe('alice');
  });

  it('parses string[] (nargs=*) flags greedily until next flag', () => {
    // string[] consumes everything up to the next --flag, matching argparse nargs="*".
    // Users put positionals before --langs to avoid ambiguity.
    const out = parseArgs(['video1', '--langs', 'de', 'en', 'fr'], SPEC);
    expect(out.flags['langs']).toEqual(['de', 'en', 'fr']);
    expect(out.positional).toEqual(['video1']);
  });

  it('translates kebab-case flag names to snake_case keys', () => {
    const out = parseArgs(['--my-flag'], {
      my_flag: { kind: 'boolean', default: false },
    });
    expect(out.flags['my_flag']).toBe(true);
  });

  it('throws on unknown flags', () => {
    expect(() => parseArgs(['--unknown'], SPEC)).toThrow(ArgvError);
  });

  it('throws when string flag is missing a value', () => {
    expect(() => parseArgs(['--name'], SPEC)).toThrow(ArgvError);
  });
});
