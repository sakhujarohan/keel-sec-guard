import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DiffPayload } from './diff.js';
import type { SASTFinding } from './sast.js';

export interface AuditResult {
  overallRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  findings: Array<{
    title: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    file?: string;
    line?: number;
    description: string;
    recommendation: string;
  }>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function auditWithGemini(
  diffPayload: DiffPayload,
  sastFindings: SASTFinding[],
  apiKey: string,
  modelName = 'gemini-2.5-flash',
  maxRetries = 3,
): Promise<AuditResult> {
  if (!apiKey) {
    return {
      overallRisk: sastFindings.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH') ? 'HIGH' : 'LOW',
      summary: 'Skipped Gemini LLM review (GEMINI_API_KEY not provided). SAST findings only.',
      findings: sastFindings.map((f) => ({
        title: f.ruleId,
        severity: f.severity,
        file: f.file,
        line: f.line,
        description: f.description,
        recommendation: 'Review and remove hardcoded secrets or unsafe patterns.',
      })),
    };
  }

  const prompt = `
You are an expert Application Security Auditor reviewing a Pull Request.

Target Files Changed: ${diffPayload.filesChanged.join(', ')}

Deterministic SAST / Secret Findings Detected Prior to LLM Scan:
${JSON.stringify(sastFindings, null, 2)}

Git Diff Payload:
\`\`\`diff
${diffPayload.rawDiff}
\`\`\`

Perform an exhaustive, full-coverage security audit focusing on:
1. Hardcoded credentials or secrets
2. OWASP Top 10 vulnerabilities (Injection, Broken Access Control, Path Traversal, Data Exposure)
3. Logic flaws, missing input validation, architectural bypasses, or unexpected side-effects

CRITICAL EXHAUSTIVE AUDIT REQUIREMENTS:
- You MUST perform an EXHAUSTIVE and COMPREHENSIVE scan of the ENTIRE diff across ALL modified files in a single pass.
- Do NOT stop after finding the first one or two issues. You must analyze every file changed and report EVERY CRITICAL, HIGH, and MEDIUM security vulnerability found across the entire diff in one unified response.
- Do NOT truncate or omit vulnerabilities.
- ONLY include actual security vulnerabilities, security risks, or anti-patterns in the "findings" array.
- DO NOT include positive notes, commendations, good practice praise, or items where recommendation is "No direct fix needed" or "No action required".
- If the diff has no security vulnerabilities, return an empty "findings": [] array and describe the clean status in "summary".

Respond ONLY in valid JSON matching this schema:
{
  "overallRisk": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "summary": "High-level 2-sentence executive summary of security findings",
  "findings": [
    {
      "title": "Short title",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "file": "path/to/file",
      "line": 12,
      "description": "Explanation of vulnerability",
      "recommendation": "Exact fix recommendation"
    }
  ]
}
`;

  const candidateModels = Array.from(new Set([modelName, 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']));
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  for (const currentModel of candidateModels) {
    let attempt = 0;
    let delay = 2000;

    while (attempt < maxRetries) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying Gemini API call (${currentModel}) - Attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
          await sleep(delay);
          delay *= 2;
        }

        const model = genAI.getGenerativeModel({
          model: currentModel,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const parsed = JSON.parse(responseText) as AuditResult;

        // Programmatically sanitize findings to strip positive notes or non-vulnerabilities
        if (parsed.findings) {
          parsed.findings = parsed.findings.filter((f) => {
            const titleLower = (f.title || '').toLowerCase();
            const recLower = (f.recommendation || '').toLowerCase();
            if (titleLower.startsWith('positive') || titleLower.includes('commendation')) return false;
            if (recLower.includes('no direct fix needed') || recLower.includes('no action required')) return false;
            return true;
          });
        }

        return parsed;
      } catch (error: any) {
        lastError = error;
        const errMessage = error?.message || String(error);

        console.warn(`⚠️ Gemini model ${currentModel} error (Attempt ${attempt + 1}): ${errMessage.split('\n')[0]}`);

        // If 429 Rate limit, pause 8s to allow free-tier quota window to reset
        if (errMessage.includes('429') || errMessage.includes('Quota exceeded')) {
          console.warn(`⏳ Gemini rate limit (429) encountered. Pausing 8 seconds for quota reset...`);
          await sleep(8000);
        } else if (errMessage.includes('404') || errMessage.includes('not found') || errMessage.includes('503') || errMessage.includes('high demand')) {
          if (attempt >= 1) {
            console.warn(`⚡ Switching from ${currentModel} to fallback model...`);
            break;
          }
        }

        attempt++;
      }
    }
  }

  const rawErr = lastError?.message || String(lastError);
  let cleanErr = rawErr.split('\n')[0];
  if (cleanErr.includes('429') || cleanErr.includes('Quota exceeded')) {
    cleanErr = 'Gemini LLM API rate limit exceeded (429).';
  } else if (cleanErr.length > 120) {
    cleanErr = `${cleanErr.slice(0, 120)}...`;
  }

  return {
    overallRisk: sastFindings.length > 0 ? 'HIGH' : 'LOW',
    summary: `${cleanErr} Falling back to deterministic SAST results.`,
    findings: sastFindings.map((f) => ({
      title: f.ruleId,
      severity: f.severity,
      file: f.file,
      line: f.line,
      description: f.description,
      recommendation: 'Review and remove flagged security patterns.',
    })),
  };
}
