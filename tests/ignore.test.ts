import { describe, expect, it } from 'vitest';
import { filterAuditResult, filterSASTFindings, isIgnored, loadIgnoreRules } from '../src/ignore.js';
import type { AuditResult } from '../src/llm.js';
import type { SASTFinding } from '../src/sast.js';

describe('Ignore Engine', () => {
  it('should parse comma-separated ignore flags', () => {
    const rules = loadIgnoreRules('Elevated Permissions, UNAUTHENTICATED_ACTOR');
    expect(rules).toContain('elevated permissions');
    expect(rules).toContain('unauthenticated_actor');
  });

  it('should match keywords case-insensitively', () => {
    expect(isIgnored('Supply Chain Risk: Elevated Permissions for Action', ['elevated permissions'])).toBe(true);
    expect(isIgnored('Unsafe Eval', ['elevated permissions'])).toBe(false);
  });

  it('should filter out muted findings from AuditResult', () => {
    const mockResult: AuditResult = {
      overallRisk: 'MEDIUM',
      summary: 'Found 1 medium issue.',
      findings: [
        {
          title: 'Supply Chain Risk: Elevated Permissions for Action',
          severity: 'MEDIUM',
          description: 'Uses write permissions.',
          recommendation: 'Review permissions.',
        },
      ],
    };

    const filtered = filterAuditResult(mockResult, ['elevated permissions']);
    expect(filtered.findings.length).toBe(0);
    expect(filtered.overallRisk).toBe('LOW');
    expect(filtered.summary).toContain('Muted 1 finding(s)');
  });
});
