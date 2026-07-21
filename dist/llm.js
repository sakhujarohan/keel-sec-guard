import { GoogleGenerativeAI } from '@google/generative-ai';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function auditWithGemini(diffPayload, sastFindings, apiKey, modelName = 'gemini-2.5-flash', maxRetries = 2) {
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

Perform a security audit focusing on:
1. Hardcoded credentials or secrets
2. OWASP Top 10 vulnerabilities (Injection, Broken Access Control, Data Exposure)
3. Logic flaws, missing input validation, or unexpected side-effects

CRITICAL RULES FOR FINDINGS:
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
    const candidateModels = Array.from(new Set([modelName, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro-latest']));
    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError = null;
    for (const currentModel of candidateModels) {
        let attempt = 0;
        let delay = 1500;
        while (attempt < maxRetries) {
            try {
                if (attempt > 0) {
                    console.log(`🔄 Retrying Gemini API call (${currentModel}) - Attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
                    await sleep(delay);
                    delay *= 2;
                }
                const model = genAI.getGenerativeModel({
                    model: currentModel,
                    generationConfig: { responseMimeType: 'application/json' },
                });
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                const parsed = JSON.parse(responseText);
                // Programmatically sanitize findings to strip positive notes or non-vulnerabilities
                if (parsed.findings) {
                    parsed.findings = parsed.findings.filter((f) => {
                        const titleLower = (f.title || '').toLowerCase();
                        const recLower = (f.recommendation || '').toLowerCase();
                        if (titleLower.startsWith('positive') || titleLower.includes('commendation'))
                            return false;
                        if (recLower.includes('no direct fix needed') || recLower.includes('no action required'))
                            return false;
                        return true;
                    });
                }
                return parsed;
            }
            catch (error) {
                lastError = error;
                const errMessage = error?.message || String(error);
                console.warn(`⚠️ Gemini model ${currentModel} error (Attempt ${attempt + 1}): ${errMessage}`);
                if (errMessage.includes('404') || errMessage.includes('not found') || errMessage.includes('503') || errMessage.includes('high demand')) {
                    if (attempt >= 1) {
                        console.warn(`⚡ Switching from ${currentModel} to fallback model...`);
                        break;
                    }
                }
                attempt++;
            }
        }
    }
    const errMessage = lastError?.message || String(lastError);
    return {
        overallRisk: sastFindings.length > 0 ? 'HIGH' : 'LOW',
        summary: `Gemini API call failed after retries (${errMessage}). Falling back to deterministic SAST results.`,
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
