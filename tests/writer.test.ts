import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeRunArtifacts } from '../src/writer.js';

describe('Writer Module & Gitignore Protection', () => {
  it('should write report, json diagnostics, log file, and auto-create .gitignore', () => {
    const testDir = path.join(process.cwd(), 'temp-test-output');

    writeRunArtifacts(testDir, '# Test Report', {
      timestamp: new Date().toISOString(),
      targetBranch: 'main',
      model: 'gemini-1.5-flash',
      diffStats: { filesChanged: ['test.ts'], lineCount: 10, isTruncated: false },
      sastFindingsCount: 0,
      sastFindings: [],
      geminiStatus: 'SUCCESS',
      geminiAuditResult: { overallRisk: 'LOW', summary: 'Clean', findings: [] },
      passed: true,
      failOnThreshold: 'HIGH',
      logs: ['[INFO] Test execution log'],
    });

    expect(fs.existsSync(path.join(testDir, '.gitignore'))).toBe(true);
    expect(fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8')).toContain('*');
    expect(fs.existsSync(path.join(testDir, 'audit-report.md'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'audit-run.json'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'audit.log'))).toBe(true);

    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
  });
});
