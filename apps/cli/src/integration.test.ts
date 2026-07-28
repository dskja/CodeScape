import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

interface CodescapeResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCodescape(args: string[], cwd = repoRoot): Promise<CodescapeResult> {
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['codescape', ...args], { cwd, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('close', (exitCode) => {
      resolve({ exitCode: exitCode ?? 0, stdout, stderr });
    });
  });
}

async function withTempRepo<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'codescape-cli-'));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('codescape CLI integration', () => {
  it('--help exits with code 0', async () => {
    const { exitCode, stdout } = await runCodescape(['--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/Usage:/);
  });

  it('-h exits with code 0', async () => {
    const { exitCode, stdout } = await runCodescape(['-h']);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/Usage:/);
  });

  it('unknown options exit with a non-zero code', async () => {
    const { exitCode, stderr } = await runCodescape(['analyze', '.', '--unknown']);
    expect(exitCode).not.toBe(0);
    expect(stderr).toMatch(/Unknown option/);
  });

  it('too many positional arguments exit with a non-zero code', async () => {
    const { exitCode, stderr } = await runCodescape(['analyze', '.', 'extra']);
    expect(exitCode).not.toBe(0);
    expect(stderr).toMatch(/Too many positional arguments/);
  });

  it('analyzes a repository and writes --output to a missing parent directory', () =>
    withTempRepo(async (root) => {
      await writeFile(join(root, 'a.ts'), 'import { b } from "./b";');
      await writeFile(join(root, 'b.ts'), 'export const b = 1;');
      const output = join(root, 'out', 'world.json');

      const { exitCode, stdout } = await runCodescape(['analyze', root, '--output', output]);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/RepositoryWorld written to/);

      const content = await import(output, { with: { type: 'json' } });
      const world = content.default as { buildings: Array<{ path: string }>; roads: unknown[] };
      expect(world.buildings.length).toBe(2);
      expect(world.roads.length).toBe(1);
    }));

  it('exits non-zero for a non-existent root path', async () => {
    const { exitCode, stderr } = await runCodescape(['analyze', '/does/not/exist']);
    expect(exitCode).not.toBe(0);
    expect(stderr).toMatch(/does not exist or is not readable/);
  });

  it('exits non-zero when validation fails', async () => {
    const { exitCode } = await runCodescape(['validate', '-']);
    // No stdin provided, so it should fail.
    expect(exitCode).not.toBe(0);
  });
});
