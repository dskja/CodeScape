#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { typeScriptAnalyzer } from '@codescape/analyzer-typescript';
import {
  type RepositoryWorld,
  type ValidationResult,
  validateRepositoryWorld,
} from '@codescape/schema';

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

async function analyzeCommand(pathArg: string | undefined): Promise<void> {
  const target = resolve(pathArg ?? '.');
  const world = await typeScriptAnalyzer.analyze({ rootPath: target });
  const result = validateRepositoryWorld(world);
  const validWorld = assertValid(result);
  console.log(JSON.stringify(validWorld, null, 2));
}

async function validateCommand(pathArg: string | undefined): Promise<void> {
  const target = resolve(pathArg ?? '-');
  const raw = target === '-' ? await readStdin() : await readFile(target, 'utf-8');
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
  validate <file>   Validate a RepositoryWorld JSON file.
  help              Show this message.`);
}

async function main(): Promise<void> {
  const [, , command, arg] = process.argv;
  switch (command) {
    case 'analyze':
      await analyzeCommand(arg);
      break;
    case 'validate':
      await validateCommand(arg);
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
  console.error(err);
  process.exit(1);
});
