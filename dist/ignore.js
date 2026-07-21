import fs from 'node:fs';
import path from 'node:path';
export function loadIgnoreRules(ignoreFlag = '', ignoreFile = '.secguardignore') {
    const rules = [];
    if (ignoreFlag) {
        for (const rule of ignoreFlag.split(',')) {
            const trimmed = rule.trim();
            if (trimmed)
                rules.push(trimmed.toLowerCase());
        }
    }
    try {
        const filePath = path.resolve(ignoreFile);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    rules.push(trimmed.toLowerCase());
                }
            }
        }
    }
    catch { }
    return Array.from(new Set(rules));
}
export function isIgnored(text, ignoreRules) {
    if (!text || ignoreRules.length === 0)
        return false;
    const lowerText = text.toLowerCase();
    return ignoreRules.some((rule) => {
        // 1. Direct substring match
        if (lowerText.includes(rule))
            return true;
        // 2. Token match: all space-separated words in the rule exist in lowerText
        const tokens = rule.split(/\s+/).filter(Boolean);
        if (tokens.length > 1 && tokens.every((token) => lowerText.includes(token))) {
            return true;
        }
        return false;
    });
}
export function filterAuditResult(auditResult, ignoreRules) {
    if (ignoreRules.length === 0 || !auditResult.findings)
        return auditResult;
    const remainingFindings = auditResult.findings.filter((item) => {
        const fullText = `${item.title} ${item.description} ${item.file || ''}`;
        return !isIgnored(fullText, ignoreRules);
    });
    const mutedCount = auditResult.findings.length - remainingFindings.length;
    let overallRisk = 'LOW';
    if (remainingFindings.some((f) => f.severity === 'CRITICAL')) {
        overallRisk = 'CRITICAL';
    }
    else if (remainingFindings.some((f) => f.severity === 'HIGH')) {
        overallRisk = 'HIGH';
    }
    else if (remainingFindings.some((f) => f.severity === 'MEDIUM')) {
        overallRisk = 'MEDIUM';
    }
    let summary = auditResult.summary;
    if (mutedCount > 0) {
        if (remainingFindings.length === 0) {
            summary = `All flagged security findings (${mutedCount}) were suppressed by configured ignore rules. No active security risks remain.`;
        }
        else {
            summary += ` (Muted ${mutedCount} finding(s) matching ignore rules).`;
        }
    }
    return {
        overallRisk,
        summary,
        findings: remainingFindings,
    };
}
export function filterSASTFindings(sastFindings, ignoreRules) {
    if (ignoreRules.length === 0)
        return sastFindings;
    return sastFindings.filter((item) => {
        const fullText = `${item.ruleId} ${item.description} ${item.file} ${item.snippet || ''}`;
        return !isIgnored(fullText, ignoreRules);
    });
}
