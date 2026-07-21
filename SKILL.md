---
name: keel-sec-guard
description: Perform a hybrid SAST + Google Gemini 3 / Anthropic Claude security review on local git diffs before committing or creating pull requests.
---

# Keel Security Guard Skill

Use this skill to perform automated security reviews on developer or agent code diffs prior to raising PRs.

## Commands

Execute a security audit against `main`:

```bash
npx keel-sec-guard audit --branch main --fail-on HIGH
```

Install local git pre-push hook:

```bash
npx keel-sec-guard init-hook --hook-type pre-push --branch main
```

## Features

- **Secrets & SAST Detection**: Scans for hardcoded keys, passwords, and OWASP patterns.
- **Gemini 3 LLM Review**: Uses Google Gemini 3 (`gemini-3.6-flash`, `gemini-3.5-flash`) with automatic multi-key rotation on 429 rate limits.
- **Claude Failover**: Automatically fails over to Anthropic Claude Sonnet (`claude-3-7-sonnet-latest`, `claude-3-5-sonnet-latest`) if Gemini keys are exhausted.
- **Exit Codes**: Returns exit status `1` if risk meets or exceeds severity threshold.
