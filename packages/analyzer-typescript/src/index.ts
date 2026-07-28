import type { Analyzer, AnalyzerOptions } from '@codescape/analyzer-core';
import { analyzeTypeScriptDirectory } from './scanner.js';

export * from './scanner.js';

export const typeScriptAnalyzer: Analyzer = {
  analyze(options: AnalyzerOptions) {
    return analyzeTypeScriptDirectory(options.rootPath);
  },
};
