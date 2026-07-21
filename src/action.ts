import * as core from '@actions/core';
import * as github from '@actions/github';
import { extractDiff } from './diff.js';
import { filterAuditResult, filterSASTFindings, loadIgnoreRules } from './ignore.js';
import { auditWithGemini } from './llm.js';
import { formatMarkdownReport } from './reporter.js';
import { scanDiff } from './sast.js';
import { writeRunArtifacts } from './writer.js';

async function runAction() {
  const logs: string[] = [];
  const logInfo = (msg: string) => {
    core.info(msg);
    logs.push(`[${new Date().toISOString()}] ${msg}`);
  };
  const logWarning = (msg: string) => {
    core.warning(msg);
    logs.push(`[${new Date().toISOString()}] WARNING: ${msg}`);
  };

  try {
    const apiKey = core.getInput('gemini-api-key') || process.env.GEMINI_API_KEY || '';
    const anthropicApiKey = core.getInput('anthropic-api-key') || process.env.ANTHROPIC_API_KEY || '';
    const token = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';
    const model = core.getInput('model') || 'gemini-3.6-flash';
    const failOn = core.getInput('fail-on-severity') || 'HIGH';
    const outputDir = core.getInput('output-dir') || '';
    const ignoreRulesFlag = core.getInput('ignore-rules') || '';

    const ignoreRules = loadIgnoreRules(ignoreRulesFlag);
    if (ignoreRules.length > 0) {
      logInfo(`🙈 Loaded ignore rules: ${ignoreRules.join(', ')}`);
    }

    logInfo('🔍 Extracting Pull Request Git Diff...');
    const targetBranch = process.env.GITHUB_BASE_REF || 'main';
    const diffPayload = extractDiff(targetBranch);

    if (!diffPayload.rawDiff.trim()) {
      logInfo('✅ No code changes found in pull request diff.');
      return;
    }

    logInfo(`🔒 Running SAST & Secret Scanner on ${diffPayload.filesChanged.length} file(s)...`);
    const rawSastFindings = scanDiff(diffPayload);
    const sastFindings = filterSASTFindings(rawSastFindings, ignoreRules);

    let geminiStatus: 'SUCCESS' | 'SKIPPED_NO_KEY' | 'FAILED_API_ERROR' = 'SUCCESS';

    if (!apiKey && !anthropicApiKey) {
      logWarning('⚠️ Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY provided. Proceeding with SAST scan results only.');
      geminiStatus = 'SKIPPED_NO_KEY';
    } else {
      logInfo(`🤖 Calling LLM engine (${model}) for security review...`);
    }

    const rawAuditResult = await auditWithGemini(diffPayload, sastFindings, apiKey, model, 3, anthropicApiKey);
    if ((apiKey || anthropicApiKey) && rawAuditResult.summary.includes('unavailable or exhausted')) {
      geminiStatus = 'FAILED_API_ERROR';
    }

    const auditResult = filterAuditResult(rawAuditResult, ignoreRules);
    const markdownReport = formatMarkdownReport(auditResult, sastFindings);

    if (token && github.context.payload.pull_request) {
      logInfo('💬 Posting Security Audit comment to GitHub Pull Request...');
      const octokit = github.getOctokit(token);
      const prNumber = github.context.payload.pull_request.number;
      const repoOwner = github.context.repo.owner;
      const repoName = github.context.repo.repo;

      await octokit.rest.issues.createComment({
        owner: repoOwner,
        repo: repoName,
        issue_number: prNumber,
        body: markdownReport,
      });
      logInfo('✅ Pull Request comment posted successfully.');
    } else {
      logInfo('\n' + markdownReport + '\n');
    }

    const severityLevels = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const thresholdIndex = severityLevels.indexOf(failOn.toUpperCase());
    const currentRiskIndex = severityLevels.indexOf(auditResult.overallRisk);

    const passed = !(thresholdIndex > 0 && currentRiskIndex >= thresholdIndex);

    if (outputDir) {
      writeRunArtifacts(outputDir, markdownReport, {
        timestamp: new Date().toISOString(),
        targetBranch,
        model,
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
        failOnThreshold: failOn,
        logs,
      });
    }

    if (!passed) {
      core.setFailed(`❌ Security audit failed: Overall risk (${auditResult.overallRisk}) meets threshold (${failOn}).`);
    }
  } catch (error: any) {
    core.setFailed(`Action failed with error: ${error?.message || error}`);
  }
}

runAction();
