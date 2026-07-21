---
name: keel-sec-guard
description: Perform a hybrid SAST + Google Gemini security review on local git diffs before committing or creating pull requests.
---

# Keel Security Guard Skill

Use this skill to perform automated security reviews on developer or agent code diffs prior to raising PRs.

## Commands

Execute a security audit against `main`:

```bash
npx keel-sec-guard audit --branch main --fail-on HIGH
```

## Features

- **Secrets & SAST Detection**: Scans for hardcoded keys, passwords, and OWASP patterns.
- **Gemini LLM Review**: Uses Google Gemini 2.5 API for semantic risk evaluation without using Claude quota.
- **Exit Codes**: Returns exit status `1` if risk meets or exceeds severity threshold.
