#!/usr/bin/env node
import { Command } from 'commander';
import { extractDiff } from './diff.js';
import { auditWithGemini } from './llm.js';
import { formatMarkdownReport } from './reporter.js';
import { scanDiff } from './sast.js';
import { writeRunArtifacts } from './writer.js';
// Auto-load .env if available locally
try {
    process.loadEnvFile();
}
catch { }
const program = new Command();
program
    .name('keel-sec-guard')
    .description('Hybrid SAST + Gemini Security Audit tool for developer and agent diffs')
    .version('1.0.0');
program
    .command('audit')
    .description('Run a security audit against a target git branch diff')
    .option('-b, --branch <branch>', 'Target git base branch to compare against', 'main')
    .option('-m, --model <model>', 'Gemini model to use', 'gemini-2.5-flash')
    .option('-f, --fail-on <severity>', 'Fail exit status on severity: CRITICAL | HIGH | MEDIUM | NONE', 'HIGH')
    .option('-o, --output-dir <dir>', 'Directory to save markdown report, log file, and JSON diagnostics', '')
    .action(async (options) => {
    const logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(`[${new Date().toISOString()}] ${msg}`);
    };
    const logError = (msg) => {
        console.error(msg);
        logs.push(`[${new Date().toISOString()}] ERROR: ${msg}`);
    };
    log(`🔍 Extracting git diff against origin/${options.branch}...`);
    const diffPayload = extractDiff(options.branch);
    if (!diffPayload.rawDiff.trim()) {
        log('✅ No code changes detected in diff.');
        if (options.outputDir) {
            writeRunArtifacts(options.outputDir, '# Security Audit Report\n\nNo code changes detected.', {
                timestamp: new Date().toISOString(),
                targetBranch: options.branch,
                model: options.model,
                diffStats: { filesChanged: [], lineCount: 0, isTruncated: false },
                sastFindingsCount: 0,
                sastFindings: [],
                geminiStatus: 'SKIPPED_NO_KEY',
                geminiAuditResult: { overallRisk: 'LOW', summary: 'No changes detected.', findings: [] },
                passed: true,
                failOnThreshold: options.failOn,
                logs,
            });
        }
        process.exit(0);
    }
    log(`🔒 Running SAST & Secret Scanner on ${diffPayload.filesChanged.length} changed file(s)...`);
    const sastFindings = scanDiff(diffPayload);
    const apiKey = process.env.GEMINI_API_KEY || '';
    let geminiStatus = 'SUCCESS';
    if (!apiKey) {
        log('⚠️ GEMINI_API_KEY env variable not set. Running SAST scan only.');
        geminiStatus = 'SKIPPED_NO_KEY';
    }
    else {
        log(`🤖 Invoking Google Gemini API (${options.model}) for semantic security review...`);
    }
    const auditResult = await auditWithGemini(diffPayload, sastFindings, apiKey, options.model);
    if (apiKey && auditResult.summary.includes('failed or timed out')) {
        geminiStatus = 'FAILED_API_ERROR';
    }
    const markdownReport = formatMarkdownReport(auditResult, sastFindings);
    log('\n' + markdownReport + '\n');
    const severityLevels = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const thresholdIndex = severityLevels.indexOf(options.failOn.toUpperCase());
    const currentRiskIndex = severityLevels.indexOf(auditResult.overallRisk);
    const passed = !(thresholdIndex > 0 && currentRiskIndex >= thresholdIndex);
    if (options.outputDir) {
        writeRunArtifacts(options.outputDir, markdownReport, {
            timestamp: new Date().toISOString(),
            targetBranch: options.branch,
            model: options.model,
            diffStats: {
                filesChanged: diffPayload.filesChanged,
                lineCount: diffPayload.lineCount,
                isTruncated: diffPayload.isTruncated,
            },
            sastFindingsCount: sastFindings.length,
            sastFindings,
            geminiStatus,
            geminiAuditResult: auditResult,
            passed,
            failOnThreshold: options.failOn,
            logs,
        });
    }
    if (!passed) {
        logError(`Security audit failed: Overall risk (${auditResult.overallRisk}) meets threshold (${options.failOn}).`);
        process.exit(1);
    }
    else {
        log('✅ Security audit passed thresholds.');
        process.exit(0);
    }
});
program.parse();
