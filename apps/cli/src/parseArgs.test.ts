import { describe, expect, it } from 'vitest';
import { parseArgs } from './parseArgs.js';

describe('parseArgs', () => {
  it('parses analyze with positional path', () => {
    const args = parseArgs(['analyze', '.']);
    expect(args.command).toBe('analyze');
    expect(args.positional).toBe('.');
  });

  it('collects multiple extensions', () => {
    const args = parseArgs(['analyze', '.', '--extension', '.ts', '--extension', 'tsx']);
    expect(args.extensions).toEqual(['.ts', '.tsx']);
  });

  it('collects multiple excludes', () => {
    const args = parseArgs(['analyze', '.', '--exclude', 'generated', '--exclude', 'vendor']);
    expect(args.exclude).toEqual(['generated', 'vendor']);
  });

  it('parses --output', () => {
    const args = parseArgs(['analyze', '.', '--output', '.codescape/world.json']);
    expect(args.output).toBe('.codescape/world.json');
  });

  it('throws on unknown long options', () => {
    expect(() => parseArgs(['analyze', '.', '--unknown'])).toThrow('Unknown option: --unknown');
  });

  it('throws on unknown short options', () => {
    expect(() => parseArgs(['analyze', '.', '-u'])).toThrow('Unknown option: -u');
  });

  it('throws on too many positional arguments', () => {
    expect(() => parseArgs(['analyze', '.', 'extra'])).toThrow('Too many positional arguments');
  });

  it('throws on missing option values', () => {
    expect(() => parseArgs(['analyze', '.', '--extension'])).toThrow(
      'Missing value for --extension',
    );
  });
});
