import type { RepositoryWorld } from '@codescape/schema';

export interface AnalyzerOptions {
  rootPath: string;
  include?: string[];
  exclude?: string[];
}

export interface Analyzer {
  analyze(options: AnalyzerOptions): Promise<RepositoryWorld> | RepositoryWorld;
}

export interface AnalysisResult {
  world: RepositoryWorld;
}
