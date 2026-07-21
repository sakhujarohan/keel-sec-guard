import type { DiffPayload } from './diff.js';

export interface SASTFinding {
  file: string;
  line?: number;
  ruleId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  snippet?: string;
}

export function scanDiff(diffPayload: DiffPayload): SASTFinding[] {
  const findings: SASTFinding[] = [];
  const lines = diffPayload.rawDiff.split('\n');
  let currentFile = 'unknown';

  const secretPatterns = [
    {
      ruleId: 'SECRET_API_KEY',
      pattern: /(api[_-]?key|secret|access[_-]?token|password)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
      severity: 'CRITICAL' as const,
      description: 'Potential hardcoded API key or credential secret detected.',
    },
    {
      ruleId: 'AWS_ACCESS_KEY',
      pattern: /(AKIA|ASIA)[0-9A-Z]{16}/,
      severity: 'CRITICAL' as const,
      description: 'Hardcoded AWS Access Key ID detected.',
    },
    {
      ruleId: 'UNSAFE_EVAL',
      pattern: /\beval\s*\(|new\s+Function\s*\(/,
      severity: 'HIGH' as const,
      description: 'Unsafe code execution primitive (`eval` or `new Function`) detected.',
    },
    {
      ruleId: 'INSECURE_SQL_CONCAT',
      pattern: /(SELECT|INSERT|UPDATE|DELETE).*\+.*req\.(body|query|params)/i,
      severity: 'HIGH' as const,
      description: 'Potential SQL Injection via string concatenation detected.',
    },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.+)$/);
      if (match) {
        currentFile = match[1];
      }
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      const addedContent = line.substring(1);

      for (const rule of secretPatterns) {
        if (rule.pattern.test(addedContent)) {
          findings.push({
            file: currentFile,
            line: i + 1,
            ruleId: rule.ruleId,
            severity: rule.severity,
            description: rule.description,
            snippet: addedContent.trim(),
          });
        }
      }
    }
  }

  return findings;
}
