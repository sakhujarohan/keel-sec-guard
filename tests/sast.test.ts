import { describe, expect, it } from 'vitest';
import type { DiffPayload } from '../src/diff.js';
import { formatMarkdownReport } from '../src/reporter.js';

import { scanDiff } from '../src/sast.js';

describe('SAST & Secret Scanner', () => {
  it('should detect hardcoded API keys in added lines', () => {
    const mockDiff: DiffPayload = {
      rawDiff: `diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
+ const apiKey = "api_key_1234567890abcdef12345";
`,
      filesChanged: ['src/config.ts'],
      lineCount: 5,
      isTruncated: false,
    };

    const findings = scanDiff(mockDiff);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('SECRET_API_KEY');
    expect(findings[0].severity).toBe('CRITICAL');
  });

  it('should detect unsafe eval statements', () => {
    const mockDiff: DiffPayload = {
      rawDiff: `diff --git a/src/runner.ts b/src/runner.ts
--- a/src/runner.ts
+++ b/src/runner.ts
+ eval(userInput);
`,
      filesChanged: ['src/runner.ts'],
      lineCount: 5,
      isTruncated: false,
    };

    const findings = scanDiff(mockDiff);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('UNSAFE_EVAL');
    expect(findings[0].severity).toBe('HIGH');
  });
});

describe('Report Generator', () => {
  it('should render a valid Markdown report string', () => {
    const report = formatMarkdownReport(
      {
        overallRisk: 'LOW',
        summary: 'All clean.',
        findings: [],
      },
      [],
    );

    expect(report).toContain('Keel Security Guard Audit Report');
    expect(report).toContain('LOW');
  });
});
