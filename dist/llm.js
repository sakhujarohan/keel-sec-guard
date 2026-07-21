import { GoogleGenerativeAI } from '@google/generative-ai';
export async function auditWithGemini(diffPayload, sastFindings, apiKey, modelName = 'gemini-2.5-flash') {
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
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' },
        });
        const prompt = `
You are an expert Application Security Auditor reviewing a Pull Request.

Target Files Changed: ${diffPayload.filesChanged.join(', ')}

Deterministic SAST / Secret Findings Detected Prior to LLM Scan:
${JSON.stringify(sastFindings, null, 2)}

Git Diff Payload:
\`\`\`diff
${diffPayload.rawDiff}
\`\`\`

Perform a security audit focusing on:
1. Hardcoded credentials or secrets
2. OWASP Top 10 vulnerabilities (Injection, Broken Access Control, Data Exposure)
3. Logic flaws, missing input validation, or unexpected side-effects

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
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const parsed = JSON.parse(responseText);
        return parsed;
    }
    catch (error) {
        const errMessage = error?.message || String(error);
        return {
            overallRisk: sastFindings.length > 0 ? 'HIGH' : 'LOW',
            summary: `Gemini API call failed (${errMessage}). Falling back to deterministic SAST results.`,
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
}
