import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function auditWithGemini(diffPayload, sastFindings, apiKey, modelName = 'gemini-3.6-flash', maxRetries = 3, anthropicApiKey = process.env.ANTHROPIC_API_KEY || '') {
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
    if (apiKey) {
        const candidateModels = Array.from(new Set([modelName, 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']));
        const genAI = new GoogleGenerativeAI(apiKey);
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
                    const parsed = JSON.parse(responseText);
                    return sanitizeAuditResult(parsed);
                }
                catch (error) {
                    const errMessage = error?.message || String(error);
                    console.warn(`⚠️ Gemini model ${currentModel} error (Attempt ${attempt + 1}): ${errMessage.split('\n')[0]}`);
                    if (errMessage.includes('429') || errMessage.includes('Quota exceeded')) {
                        console.warn(`⏳ Gemini rate limit (429) encountered. Pausing 6 seconds...`);
                        await sleep(6000);
                    }
                    else if (errMessage.includes('404') || errMessage.includes('not found') || errMessage.includes('503') || errMessage.includes('high demand')) {
                        if (attempt >= 1) {
                            console.warn(`⚡ Switching from ${currentModel} to fallback model...`);
                            break;
                        }
                    }
                    attempt++;
                }
            }
        }
        console.warn(`⚠️ Gemini API calls exhausted across all models.`);
    }
    else {
        console.log('⚠️ GEMINI_API_KEY not provided.');
    }
    // -------------------------------------------------------------------------
    // Anthropic Claude Ultimate Failover Leg (Latest Sonnet Models)
    // -------------------------------------------------------------------------
    if (anthropicApiKey) {
        const claudeModels = ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest'];
        const anthropic = new Anthropic({ apiKey: anthropicApiKey });
        for (const claudeModel of claudeModels) {
            console.log(`🤖 Failing over to Anthropic Claude (${claudeModel}) for security audit...`);
            try {
                const message = await anthropic.messages.create({
                    model: claudeModel,
                    max_tokens: 8192,
                    temperature: 0.1,
                    messages: [{ role: 'user', content: prompt }],
                });
                const block = message.content[0];
                if (block && block.type === 'text') {
                    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        parsed.summary = `[Claude Sonnet Audit] ${parsed.summary}`;
                        return sanitizeAuditResult(parsed);
                    }
                }
            }
            catch (claudeError) {
                console.warn(`⚠️ Anthropic Claude API error (${claudeModel}): ${claudeError?.message || claudeError}`);
            }
        }
    }
    return {
        overallRisk: sastFindings.length > 0 ? 'HIGH' : 'LOW',
        summary: 'LLM API calls unavailable or exhausted. Falling back to deterministic SAST results.',
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
function sanitizeAuditResult(parsed) {
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
