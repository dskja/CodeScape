import type { Dirent } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import {
  join,
  basename as pathBasename,
  extname as pathExtname,
  relative,
  resolve,
} from 'node:path';
import { dirname as posixDirname, join as posixJoin } from 'node:path/posix';
import type { AnalyzerOptions, AnalyzerResult } from '@codescape/analyzer-core';
import {
  deriveDistricts,
  detectCycles,
  getLanguage,
  normalizeRepositoryPath,
  repositoryBasename,
  repositoryDirname,
  repositoryExtension,
} from '@codescape/analyzer-core';
import type {
  Building,
  DependencyRoad,
  Repository,
  RepositoryMetrics,
  RepositoryWorld,
  RoadKind,
} from '@codescape/schema';
import * as ts from 'typescript';

const DEFAULT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'out', 'coverage']);
const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];

interface ParsedFile {
  absolutePath: string;
  relativePath: string;
  content: string;
  extension: string;
  language: string;
  linesOfCode: number;
  bytes: number;
  complexity: number;
  mtime: Date;
  imports: Array<{ specifier: string; kind: RoadKind; weight: number }>;
}

interface ScanResult {
  files: ParsedFile[];
  skippedFiles: Array<{ path: string; reason: string }>;
}

function toExtensionFormat(ext: string): string {
  return ext.startsWith('.') ? ext : `.${ext}`;
}

function countLines(content: string): number {
  return content.split('\n').filter((line) => line.trim().length > 0).length;
}

function countComplexity(content: string): number {
  const matches = content.match(/\b(if|else|for|while|switch|case|catch|\?|\|\||&&)\b/g);
  return matches ? matches.length : 0;
}

function isRelativeOrAbsolute(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/');
}

function extractImports(
  content: string,
  fileName: string,
): Array<{ specifier: string; kind: RoadKind; weight: number }> {
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.Deferred,
  );
  const imports: Array<{ specifier: string; kind: RoadKind; weight: number }> = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const isTypeOnly = node.importClause?.isTypeOnly ?? false;
        const kind: RoadKind = isTypeOnly ? 'type-import' : 'static-import';
        imports.push({ specifier: moduleSpecifier.text, kind, weight: 1 });
      }
    } else if (ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        const kind: RoadKind = node.isTypeOnly ? 'type-import' : 'static-import';
        imports.push({ specifier: moduleSpecifier.text, kind, weight: 1 });
      }
    } else if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) {
          imports.push({ specifier: argument.text, kind: 'dynamic-import', weight: 0.5 });
        }
      } else if (
        ts.isIdentifier(expression) &&
        expression.text === 'require' &&
        node.arguments.length === 1
      ) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) {
          imports.push({ specifier: argument.text, kind: 'require', weight: 1 });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

function toInternalPath(absolutePath: string, rootPath: string): string {
  const rel = relative(rootPath, absolutePath).replace(/\\/g, '/');
  return normalizeRepositoryPath(rel);
}

function resolveImportPath(
  sourcePath: string,
  specifier: string,
  filesByPath: Map<string, ParsedFile>,
): string | null {
  if (!isRelativeOrAbsolute(specifier)) return null;

  const sourceDir = posixDirname(sourcePath);
  let base: string;
  if (specifier.startsWith('/')) {
    base = specifier.slice(1);
  } else {
    base = posixJoin(sourceDir, specifier);
  }
  base = normalizeRepositoryPath(base);
  if (base === '') return null;

  const candidates: string[] = [base];
  const existingExt = pathExtname(base);
  if (existingExt !== '') {
    const withoutExt = base.slice(0, -existingExt.length);
    candidates.push(withoutExt);
  }

  for (const candidate of candidates) {
    if (filesByPath.has(candidate)) return candidate;
    for (const ext of SUPPORTED_EXTENSIONS) {
      const withExt = `${candidate}${ext}`;
      if (filesByPath.has(withExt)) return withExt;
      const indexFile = `${candidate}/index${ext}`;
      if (filesByPath.has(indexFile)) return indexFile;
    }
  }

  return null;
}

async function tryReadText(
  absolutePath: string,
): Promise<{ content: string; bytes: number; mtime: Date } | null> {
  try {
    const [stats, content] = await Promise.all([
      stat(absolutePath),
      readFile(absolutePath, 'utf-8'),
    ]);
    if (content.includes('\u0000')) {
      return null;
    }
    return { content, bytes: stats.size, mtime: stats.mtime };
  } catch {
    return null;
  }
}

async function scanDirectory(
  rootPath: string,
  current: string,
  options: Omit<AnalyzerOptions, 'rootPath'>,
): Promise<ScanResult> {
  let entries: Dirent[];
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch {
    return { files: [], skippedFiles: [] };
  }

  const allowedExtensions = options.extensions
    ? new Set(options.extensions.map(toExtensionFormat))
    : DEFAULT_EXTENSIONS;
  const excludeSet = new Set(options.exclude ?? []);
  const files: ParsedFile[] = [];
  const skippedFiles: Array<{ path: string; reason: string }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const childPath = join(current, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || excludeSet.has(entry.name)) continue;
      const sub = await scanDirectory(rootPath, childPath, options);
      files.push(...sub.files);
      skippedFiles.push(...sub.skippedFiles);
    } else if (entry.isFile()) {
      const ext = pathExtname(entry.name);
      if (!allowedExtensions.has(ext)) continue;
      const readResult = await tryReadText(childPath);
      if (!readResult) {
        skippedFiles.push({
          path: toInternalPath(childPath, rootPath),
          reason: 'not a readable UTF-8 text file',
        });
        continue;
      }
      const internalPath = toInternalPath(childPath, rootPath);
      const extension = repositoryExtension(entry.name);
      files.push({
        absolutePath: childPath,
        relativePath: internalPath,
        content: readResult.content,
        extension,
        language: getLanguage(extension),
        linesOfCode: countLines(readResult.content),
        bytes: readResult.bytes,
        complexity: countComplexity(readResult.content),
        mtime: readResult.mtime,
        imports: extractImports(readResult.content, entry.name),
      });
    }
  }

  return { files, skippedFiles };
}

export async function analyzeTypeScriptDirectory(
  rootPath: string,
  options: Omit<AnalyzerOptions, 'rootPath'> = {},
): Promise<AnalyzerResult> {
  const resolvedRoot = resolve(rootPath);
  const { files, skippedFiles } = await scanDirectory(resolvedRoot, resolvedRoot, options);
  const filesByPath = new Map(files.map((f) => [f.relativePath, f]));

  const pathList = files.map((f) => f.relativePath).sort();
  const districts = deriveDistricts(pathList);
  const districtByPath = new Map(districts.map((d) => [d.path, d]));

  const analyzedAt = new Date().toISOString();
  const repo: Repository = {
    name: pathBasename(resolvedRoot),
    rootPath: resolvedRoot,
    analyzedAt,
    languages: [],
  };

  const buildingByPath = new Map<string, Building>();
  for (const file of files) {
    const dir = repositoryDirname(file.relativePath);
    const district = districtByPath.get(dir);
    if (!district) {
      continue;
    }
    const building: Building = {
      id: `building:${file.relativePath}`,
      districtId: district.id,
      path: file.relativePath,
      name: repositoryBasename(file.relativePath),
      extension: file.extension,
      language: file.language,
      linesOfCode: file.linesOfCode,
      bytes: file.bytes,
      complexity: file.complexity,
      importCount: 0,
      importedByCount: 0,
      lastModifiedAt: file.mtime.toISOString(),
    };
    buildingByPath.set(file.relativePath, building);
  }

  const roads: DependencyRoad[] = [];
  const unresolvedImports: Array<{ sourcePath: string; specifier: string; kind: string }> = [];
  for (const file of files) {
    const source = buildingByPath.get(file.relativePath);
    if (!source) continue;
    for (const imp of file.imports) {
      const resolved = resolveImportPath(file.relativePath, imp.specifier, filesByPath);
      if (!resolved) {
        if (isRelativeOrAbsolute(imp.specifier)) {
          unresolvedImports.push({
            sourcePath: file.relativePath,
            specifier: imp.specifier,
            kind: imp.kind,
          });
        }
        continue;
      }
      const target = buildingByPath.get(resolved);
      if (!target) continue;
      roads.push({
        id: `road:${source.id}->${target.id}:${imp.kind}`,
        sourceBuildingId: source.id,
        targetBuildingId: target.id,
        kind: imp.kind,
        weight: imp.weight,
      });
      source.importCount += 1;
      target.importedByCount += 1;
    }
  }

  const buildings = Array.from(buildingByPath.values());
  repo.languages = Array.from(new Set(buildings.map((b) => b.language))).sort();

  const metrics: RepositoryMetrics = {
    totalFiles: buildings.length,
    totalDirectories: districts.length,
    totalLinesOfCode: buildings.reduce((sum, b) => sum + b.linesOfCode, 0),
    totalDependencies: roads.length,
    circularDependencyGroups: detectCycles(roads),
  };

  const world: RepositoryWorld = {
    schemaVersion: 1,
    repository: repo,
    districts,
    buildings,
    roads,
    metrics,
  };

  return {
    world,
    report: {
      unresolvedImports,
      skippedFiles,
    },
  };
}
