# 🛡️ Keel Security Guard (`keel-sec-guard`)

[![Release](https://img.shields.io/badge/Release-v1.0.0-brightgreen.svg)](https://github.com/sakhujarohan/keel-sec-guard/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-v1-purple)](action.yml)

> **Hybrid SAST + Google Gemini 3 / Anthropic Claude Security Reviewer for Developer & AI Agent Pull Requests.**

`keel-sec-guard` is a lightweight, dual-mode security auditing tool that protects your codebase from hardcoded credentials, structural AST vulnerabilities, and logic flaws. It combines deterministic static analysis with **Google Gemini 3** (`gemini-3.6-flash`, `gemini-3.5-flash`) semantic code analysis, automatic **multi-key rotation**, and **Anthropic Claude 3.7 / 3.5 Sonnet failover**, running **locally via CLI / Git Hook / Agent Skill** and **in CI/CD via GitHub Actions**.

---

## ✨ Features

- **⚡ Hybrid Security Engine**: Combines 100% deterministic secret/OWASP scanning with Google Gemini 3 semantic analysis.
- **🤖 Dual Execution Modes**: Works locally as a CLI / Git Hook / Agent Skill (`npx keel-sec-guard`) and in CI/CD as a reusable GitHub Action.
- **🔑 Multi-Key Rotation & Failover**: Pass comma-separated API keys (`key1,key2`); automatically rotates to a secondary key on `429 Rate Limit` errors.
- **🤖 Anthropic Claude Ultimate Failover**: Automatically fails over to Claude Sonnet (`claude-3-7-sonnet-latest`, `claude-3-5-sonnet-latest`) if Gemini keys are exhausted.
- **⚓ Automated Git Hooks**: Supports `npx keel-sec-guard init-hook` to block insecure pushes/commits locally before code leaves your machine.
- **🔒 Public Fork Protection**: Operates safely in read-only mode on external PRs to prevent secret exfiltration attacks.
- **📁 Automated Artifacts & Gitignore**: Automatically exports Markdown reports, JSON diagnostics, and execution logs into a self-gitignored output folder (`.keel/sec-guard/`).

---

## 🚀 Quickstart

### 1. GitHub Action Setup (CI/CD)

Add `.github/workflows/security-audit.yml` to any repository:

```yaml
name: Security Audit

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Keel Security Guard
        uses: sakhujarohan/keel-sec-guard@v1
        with:
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          output-dir: '.keel/sec-guard'
          fail-on-severity: 'HIGH'
```

---

### 2. Local Developer & CLI Setup

Get free keys from [Google AI Studio](https://aistudio.google.com/app/apikey) and place them in your `.env` file (comma-separated keys supported for instant rate limit rotation):

```bash
# .env
GEMINI_API_KEY=AIzaSy_Primary_Key,AIzaSy_Secondary_Key
ANTHROPIC_API_KEY=sk-ant-api03... (optional Claude fallback)
```

Run a security review on your local git branch diff:

```bash
# Run locally via npx
npx keel-sec-guard audit --branch main --output-dir .keel/sec-guard

# Install automated local git pre-push hook
npx keel-sec-guard init-hook --hook-type pre-push --branch main
```

---

### 3. Claude Code / AI Agent Skill Integration

Include [`SKILL.md`](SKILL.md) in your AI Agent skills directory to allow local coding agents (Claude Code, Gemini CLI, Cursor) to run security audits autonomously before submitting PRs:

```bash
# Ask your AI Agent:
"Run a security audit on my diff before creating the PR"
```

---

## ⚙️ Configuration & Options

### GitHub Action Inputs (`action.yml`)

| Input | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `gemini-api-key` | Google AI Studio Gemini API Key (comma-separated list supported) | No | `''` |
| `anthropic-api-key` | Anthropic API Key for Claude fallback if Gemini API fails | No | `''` |
| `github-token` | GitHub token for posting PR comments | No | `${{ github.token }}` |
| `model` | Gemini model to use (`gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`) | No | `'gemini-3.6-flash'` |
| `fail-on-severity` | Threshold to fail build (`CRITICAL`, `HIGH`, `MEDIUM`, `NONE`) | No | `'HIGH'` |
| `output-dir` | Folder path to save markdown report, log file, and JSON | No | `''` |

### CLI Command Options (`npx keel-sec-guard audit`)

| Option | Flag | Description | Default |
| :--- | :--- | :--- | :--- |
| Base Branch | `-b, --branch <branch>` | Base branch to diff against | `main` |
| Gemini Model | `-m, --model <model>` | Gemini model name | `gemini-3.6-flash` |
| Fail Threshold| `-f, --fail-on <severity>` | Severity threshold to exit code 1 | `HIGH` |
| Output Dir | `-o, --output-dir <dir>` | Directory to save audit artifacts | `''` |
| Ignore Rules | `-i, --ignore-rules <rules>` | Comma-separated rules to mute (also reads `.secguardignore`) | `''` |
| Anthropic Key| `--anthropic-api-key <key>` | Anthropic API key for Claude fallback | `''` |

---

## 📁 Output Artifacts & Diagnostics

When `--output-dir` (or `output-dir` in CI) is set, `keel-sec-guard` exports diagnostic files to the specified directory:

```text
.keel/sec-guard/
├── .gitignore (auto-created with * to prevent accidental git commits)
├── audit-report.md (Formatted Markdown security review report)
├── audit-run.json (Structured JSON diagnostics, SAST stats & LLM response)
└── audit.log (Timestamped execution trace log)
```

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.
