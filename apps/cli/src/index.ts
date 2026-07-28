#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { typeScriptAnalyzer } from '@codescape/analyzer-typescript';
import {
  type RepositoryWorld,
  type ValidationResult,
  validateRepositoryWorld,
} from '@codescape/schema';
import { parseArgs } from './parseArgs.js';

function printErrors(errors: string[]): void {
  console.error('Validation failed:');
  for (const err of errors) console.error(`  - ${err}`);
}

function assertValid(result: ValidationResult): RepositoryWorld {
  if (!result.success) {
    printErrors(result.errors);
    process.exit(1);
  }
  return result.data;
}

async function analyzeCommand(args: ReturnType<typeof parseArgs>): Promise<void> {
  const target = resolve(args.positional ?? '.');
  const result = await typeScriptAnalyzer.analyze({
    rootPath: target,
    extensions: args.extensions,
    exclude: args.exclude,
  });

  if (result.report.unresolvedImports.length > 0) {
    console.error('Unresolved local imports:');
    for (const imp of result.report.unresolvedImports) {
      console.error(`  ${imp.sourcePath} -> ${imp.specifier} (${imp.kind})`);
    }
  }

  if (result.report.skippedFiles.length > 0) {
    console.error('Skipped files:');
    for (const f of result.report.skippedFiles) {
      console.error(`  ${f.path}: ${f.reason}`);
    }
  }

  const validation = validateRepositoryWorld(result.world);
  const validWorld = assertValid(validation);
  const json = JSON.stringify(validWorld, null, 2);

  if (args.output) {
    const outputPath = resolve(args.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, json, 'utf-8');
    console.log(`RepositoryWorld written to ${outputPath}`);
  } else {
    console.log(json);
  }
}

async function validateCommand(pathArg: string | undefined): Promise<void> {
  const target = pathArg ?? '-';
  const raw = target === '-' ? await readStdin() : await readFile(resolve(target), 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  const result = validateRepositoryWorld(parsed);
  assertValid(result);
  console.log('Valid RepositoryWorld');
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function printHelp(): void {
  console.log(`Usage: codescape <command> [options]

Commands:
  analyze <path>    Analyze a TypeScript/JavaScript repository and print RepositoryWorld JSON.
  validate <file>  Validate a RepositoryWorld JSON file.
  help              Show this message.

Analyze options:
  --extension <ext>  Include file extension, can be repeated (default: .ts .tsx .js .jsx .mjs .cjs .mts .cts)
  --exclude <name>   Exclude directory or file name, can be repeated
  --output <path>    Write JSON to file instead of stdout`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case 'analyze':
      await analyzeCommand(args);
      break;
    case 'validate':
      await validateCommand(args.positional);
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      printHelp();
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
