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

  it('throws on unknown options', () => {
    expect(() => parseArgs(['analyze', '.', '--unknown'])).toThrow();
  });
});
