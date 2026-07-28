import { describe, expect, it } from 'vitest';
import {
  deriveDistricts,
  normalizeRepositoryPath,
  repositoryBasename,
  repositoryDirname,
  repositoryExtension,
} from './paths.js';

describe('normalizeRepositoryPath', () => {
  it('replaces backslashes and strips leading separators', () => {
    expect(normalizeRepositoryPath('src\\app\\page.tsx')).toBe('src/app/page.tsx');
    expect(normalizeRepositoryPath('./src/app/page.tsx')).toBe('src/app/page.tsx');
    expect(normalizeRepositoryPath('/src/app/page.tsx')).toBe('src/app/page.tsx');
  });

  it('handles root-relative paths', () => {
    expect(normalizeRepositoryPath('page.tsx')).toBe('page.tsx');
  });
});

describe('repositoryDirname', () => {
  it('returns parent directory or empty string for top-level', () => {
    expect(repositoryDirname('src/app/page.tsx')).toBe('src/app');
    expect(repositoryDirname('src/page.tsx')).toBe('src');
    expect(repositoryDirname('page.tsx')).toBe('');
    expect(repositoryDirname('')).toBe('');
  });
});

describe('repositoryBasename', () => {
  it('returns file or directory name', () => {
    expect(repositoryBasename('src/app/page.tsx')).toBe('page.tsx');
    expect(repositoryBasename('src')).toBe('src');
    expect(repositoryBasename('')).toBe('');
  });
});

describe('repositoryExtension', () => {
  it('returns extension without dot', () => {
    expect(repositoryExtension('page.tsx')).toBe('tsx');
    expect(repositoryExtension('README')).toBe('');
  });
});

describe('deriveDistricts', () => {
  it('creates a root district and parents top-level directories under it', () => {
    const districts = deriveDistricts(['src/app/page.tsx', 'tests/a.ts', 'docs/intro.md']);
    const byId = new Map(districts.map((d) => [d.id, d]));

    expect(byId.get('district:root')).toEqual({
      id: 'district:root',
      path: '',
      name: 'root',
      parentId: null,
      depth: 0,
    });

    expect(byId.get('district:src')?.parentId).toBe('district:root');
    expect(byId.get('district:src/app')?.parentId).toBe('district:src');
    expect(byId.get('district:tests')?.parentId).toBe('district:root');
    expect(byId.get('district:docs')?.parentId).toBe('district:root');
  });

  it('does not loop on top-level paths', () => {
    const districts = deriveDistricts(['page.tsx']);
    expect(districts.map((d) => d.id)).toEqual(['district:root']);
  });
});
