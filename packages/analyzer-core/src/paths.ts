import {
  basename as posixBasename,
  dirname as posixDirname,
  extname as posixExtname,
  normalize as posixNormalize,
} from 'node:path/posix';
import type { District } from '@codescape/schema';

const ROOT_ID = 'district:root';

export function normalizeRepositoryPath(input: string): string {
  // Replace Windows separators first, then normalize via posix.
  const withForward = input.replace(/\\/g, '/');
  const normalized = posixNormalize(withForward);
  // strip leading ./ and / and trailing /
  return normalized.replace(/^\.\/+/g, '').replace(/^\/+|\/+$/g, '');
}

export function repositoryDirname(path: string): string {
  if (path === '') return '';
  const dir = posixDirname(path);
  if (dir === '.' || dir === '..') return '';
  return dir;
}

export function repositoryBasename(path: string): string {
  if (path === '') return '';
  const base = posixBasename(path);
  return base === '.' ? '' : base;
}

export function repositoryExtension(path: string): string {
  const ext = posixExtname(path);
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

export function getLanguage(extension: string): string {
  switch (extension) {
    case 'ts':
    case 'tsx':
    case 'mts':
    case 'cts':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'json':
      return 'json';
    default:
      return 'text';
  }
}

export function deriveDistricts(paths: string[]): District[] {
  const normalizedPaths = paths.map(normalizeRepositoryPath);
  const dirSet = new Set<string>();

  for (const p of normalizedPaths) {
    let dir = repositoryDirname(p);
    const seen = new Set<string>();
    while (dir !== '' && !seen.has(dir)) {
      seen.add(dir);
      dirSet.add(dir);
      const next = repositoryDirname(dir);
      if (next === dir) break;
      dir = next;
    }
  }

  const dirs = Array.from(dirSet).sort();
  const rootDistrict: District = {
    id: ROOT_ID,
    path: '',
    name: 'root',
    parentId: null,
    depth: 0,
  };
  const districts: District[] = [rootDistrict];

  for (const dir of dirs) {
    const parentPath = repositoryDirname(dir);
    districts.push({
      id: `district:${dir}`,
      path: dir,
      name: repositoryBasename(dir),
      parentId: parentPath === '' ? ROOT_ID : `district:${parentPath}`,
      depth: dir.split('/').filter(Boolean).length,
    });
  }

  return districts;
}
