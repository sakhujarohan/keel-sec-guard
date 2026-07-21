#!/usr/bin/env node
import { Command } from 'commander';
import { extractDiff } from './diff.js';
import { installGitHook } from './hook.js';
import { filterAuditResult, filterSASTFindings, loadIgnoreRules } from './ignore.js';
import { auditWithGemini } from './llm.js';
import { formatMarkdownReport } from './reporter.js';
import { scanDiff } from './sast.js';
import { writeRunArtifacts } from './writer.js';

// Auto-load .env if available locally
try {
  process.loadEnvFile();
} catch {}

const program = new Command();

program
  .name('keel-sec-guard')
  .description('Hybrid SAST + Gemini / Claude Security Audit tool for developer and agent diffs')
  .version('1.0.0');

program
  .command('audit')
  .description('Run a security audit against a target git branch diff')
  .option('-b, --branch <branch>', 'Target git base branch to compare against', 'main')
  .option('-m, --model <model>', 'Gemini model to use', 'gemini-2.5-flash')
  .option('-f, --fail-on <severity>', 'Fail exit status on severity: CRITICAL | HIGH | MEDIUM | NONE', 'HIGH')
  .option('-o, --output-dir <dir>', 'Directory to save markdown report, log file, and JSON diagnostics', '')
  .option('-i, --ignore-rules <rules>', 'Comma-separated keywords/rules to mute (also loads .secguardignore if present)', '')
  .option('--anthropic-api-key <key>', 'Anthropic API key for Claude fallback if Gemini API fails or rate-limits', '')
  .action(async (options) => {
    const logs: string[] = [];
    const log = (msg: string) => {
      console.log(msg);
      logs.push(`[${new Date().toISOString()}] ${msg}`);
    };
    const logError = (msg: string) => {
      console.error(msg);
      logs.push(`[${new Date().toISOString()}] ERROR: ${msg}`);
    };

    const ignoreRules = loadIgnoreRules(options.ignoreRules);
    if (ignoreRules.length > 0) {
      log(`🙈 Loaded ignore rules: ${ignoreRules.join(', ')}`);
    }

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
    const rawSastFindings = scanDiff(diffPayload);
    const sastFindings = filterSASTFindings(rawSastFindings, ignoreRules);

    const apiKey = process.env.GEMINI_API_KEY || '';
    const anthropicApiKey = options.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
    let geminiStatus: 'SUCCESS' | 'SKIPPED_NO_KEY' | 'FAILED_API_ERROR' = 'SUCCESS';

    if (!apiKey && !anthropicApiKey) {
      log('⚠️ Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY set. Running SAST scan only.');
      geminiStatus = 'SKIPPED_NO_KEY';
    } else {
      log(`🤖 Invoking LLM engine (${options.model} with Claude fallback) for security review...`);
    }

    const rawAuditResult = await auditWithGemini(diffPayload, sastFindings, apiKey, options.model, 3, anthropicApiKey);
    if ((apiKey || anthropicApiKey) && rawAuditResult.summary.includes('unavailable or exhausted')) {
      geminiStatus = 'FAILED_API_ERROR';
    }

    const auditResult = filterAuditResult(rawAuditResult, ignoreRules);
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
    } else {
      log('✅ Security audit passed thresholds.');
      process.exit(0);
    }
  });

program
  .command('init-hook')
  .description('Install a local git hook to run security audits automatically before commit or push')
  .option('-t, --hook-type <type>', 'Hook type: pre-push | pre-commit', 'pre-push')
  .option('-b, --branch <branch>', 'Target git base branch to compare against', 'main')
  .option('-f, --fail-on <severity>', 'Fail severity threshold: CRITICAL | HIGH | MEDIUM', 'HIGH')
  .action(async (options) => {
    try {
      const result = await installGitHook({
        repoRoot: process.cwd(),
        hookType: options.hookType as 'pre-push' | 'pre-commit',
        branch: options.branch,
        failOn: options.failOn,
      });

      console.log(`✓ Installed local git security hook: ${result.path}`);
      console.log(`  Every ${options.hookType} will now run keel-sec-guard audit against origin/${options.branch}.`);
    } catch (error: any) {
      console.error(`❌ Failed to install git hook: ${error?.message || error}`);
      process.exit(1);
    }
  });

program.parse();
