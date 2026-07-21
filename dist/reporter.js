export function formatMarkdownReport(auditResult, sastFindings) {
    const riskEmoji = {
        CRITICAL: '🚨 CRITICAL',
        HIGH: '⚠️ HIGH',
        MEDIUM: '⚡ MEDIUM',
        LOW: '✅ LOW',
    }[auditResult.overallRisk];
    let markdown = `## 🛡️ Keel Security Guard Audit Report\n\n`;
    markdown += `**Overall Security Risk:** ${riskEmoji}\n\n`;
    markdown += `### Executive Summary\n${auditResult.summary}\n\n`;
    if (sastFindings.length > 0) {
        markdown += `### 🔒 Deterministic Secret & SAST Findings\n\n`;
        markdown += `| Severity | Rule | File | Snippet |\n`;
        markdown += `| :--- | :--- | :--- | :--- |\n`;
        for (const f of sastFindings) {
            markdown += `| **${f.severity}** | \`${f.ruleId}\` | \`${f.file}\` | \`${f.snippet || ''}\` |\n`;
        }
        markdown += `\n`;
    }
    if (auditResult.findings && auditResult.findings.length > 0) {
        markdown += `### 💡 Detailed Security & Code Quality Vulnerabilities\n\n`;
        for (const item of auditResult.findings) {
            markdown += `#### [${item.severity}] ${item.title}\n`;
            if (item.file) {
                markdown += `- **Location:** \`${item.file}\`${item.line ? ` (Line ${item.line})` : ''}\n`;
            }
            markdown += `- **Description:** ${item.description}\n`;
            markdown += `- **Recommendation:** ${item.recommendation}\n\n`;
        }
    }
    else if (sastFindings.length === 0) {
        markdown += `✨ *No security vulnerabilities or high-entropy secrets were detected in this diff!*\n`;
    }
    markdown += `\n---\n*Powered by [Keel Security Guard](https://github.com/sakhujarohan/keel-sec-guard)*`;
    return markdown;
}
