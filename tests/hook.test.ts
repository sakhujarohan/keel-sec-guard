import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { installGitHook } from '../src/hook.js';

describe('Git Hook Installer', () => {
  it('should install pre-push git hook script with correct permissions', async () => {
    const tempDir = path.join(process.cwd(), 'temp-hook-test');
    fs.mkdirSync(tempDir, { recursive: true });

    const result = await installGitHook({
      repoRoot: tempDir,
      hookType: 'pre-push',
      branch: 'main',
      failOn: 'HIGH',
    });

    const expectedHookFile = path.join(tempDir, '.git', 'hooks', 'pre-push');
    expect(fs.existsSync(expectedHookFile)).toBe(true);

    const content = fs.readFileSync(expectedHookFile, 'utf-8');
    expect(content).toContain('#!/bin/sh');
    expect(content).toContain('npx keel-sec-guard audit --branch main --fail-on HIGH');
    expect(result.created).toBe(true);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
