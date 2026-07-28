import type { RepositoryWorld } from '@codescape/schema';

export interface UnresolvedImport {
  sourcePath: string;
  specifier: string;
  kind: string;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface AnalyzerReport {
  unresolvedImports: UnresolvedImport[];
  skippedFiles: SkippedFile[];
}

export interface AnalyzerOptions {
  rootPath: string;
  extensions?: string[];
  exclude?: string[];
}

export interface AnalyzerResult {
  world: RepositoryWorld;
  report: AnalyzerReport;
}

export interface Analyzer {
  analyze(options: AnalyzerOptions): Promise<AnalyzerResult>;
}
