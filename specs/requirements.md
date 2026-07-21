---
artifact: requirements
phase: 1
gate: G1
status: signed-off
updated: 2026-07-21
---

# Requirements — keel-sec-guard

**Status:** DRAFT  
**Run:** keel-sec-guard · **Profile:** standard (Security: production)

---

## Problem Statement

Developers and AI agents frequently raise Pull Requests that may contain hardcoded secrets, structural security flaws, or logical vulnerabilities. Existing SAST tools lack context, while LLM-only review tools are expensive and subject to hallucinations. `keel-sec-guard` is a standalone hybrid security review engine that combines deterministic static analysis (SAST/secrets scanning) with Google Gemini semantic analysis, runnable both locally as a CLI/Agent Skill and in CI/CD as a reusable GitHub Action.

---

## Functional Requirements

| ID | Requirement (EARS) | Acceptance Criteria |
|----|--------------------|---------------------|
| **R1** | When invoked on a repository diff, the system shall extract modified code files while filtering out lockfiles (`package-lock.json`, etc.), binary assets, and ignored patterns. | Diffs are correctly filtered and truncated if exceeding token limits without breaking file context. |
| **R2** | When analyzing code changes, the system shall execute deterministic secret scanning (entropy/patterns) and SAST rules before LLM invocation. | Hardcoded secrets and known AST security violations are detected with 100% determinism. |
| **R3** | When SAST/secret findings are present, the system shall feed these structured findings alongside the diff into Google Gemini (via `@google/genai` SDK) for semantic risk scoring. | Gemini prompt contains SAST context, reducing hallucinations and producing actionable remediation steps. |
| **R4** | When executing in a GitHub Action environment, the system shall post or update a formatted Markdown security report comment on the Pull Request via `@actions/github`. | PR comments are created/updated cleanly without duplicate spam on repeated commits. |
| **R5** | When executing in a local CLI environment, the system shall output an ANSI-formatted security summary to stdout and exit with code `0` (clean) or `1` (blocking violations). | Local execution works via `npx keel-sec-guard` and matches output standards. |
| **R6** | Where the PR originates from an external fork on a public repository, the system shall operate in a secure read-only mode to prevent `GEMINI_API_KEY` exfiltration. | Untrusted fork code is never executed in a context with secret access. |

---

## Non-Functional Requirements

| ID | Concern | Requirement | Source |
|----|---------|-------------|--------|
| **N1** | Performance | Combined execution (SAST + Gemini LLM call) shall complete in < 30 seconds for typical PR diffs (< 1000 lines). | Inferred |
| **N2** | Cost | The system shall consume $0 in LLM costs by default using Google AI Studio's Gemini 2.5 Flash free tier quota. | Stated |
| **N3** | Security | `GEMINI_API_KEY` and `GITHUB_TOKEN` must never be logged or exposed in public workflow logs or PR comments. | Mandated |
| **N4** | Portability | The core engine must be runnable on Linux, macOS, and inside standard GitHub Action runners (`ubuntu-latest`). | Stated |
| **N5** | Reliability | Network timeouts or API rate-limits from Gemini must fail gracefully without crashing CI pipelines unless blocking severity is set. | Stated |

---

## Performance Targets

| Metric | Target | Achieved |
|--------|--------|----------|
| Total Audit Time | < 30 seconds | *(Pending Build)* |
| SAST Execution Time | < 5 seconds | *(Pending Build)* |
| Gemini API Response Time | < 15 seconds | *(Pending Build)* |

---

## Constraints

1. Must be written in TypeScript/Node.js to match the Keel v2 stack conventions.
2. Must use official `@google/genai` SDK for Gemini API integration.
3. Must expose a valid GitHub Composite Action via `action.yml`.
4. Must expose a `SKILL.md` for seamless integration into local AI agents (Claude Code, Gemini CLI, Cursor).

---

## Assumptions

| Assumption | Status |
|------------|--------|
| `GEMINI_API_KEY` is provided via GitHub Repository Secrets or environment variable. | proposed |
| Repositories running `keel-sec-guard` have git history available (`fetch-depth: 0` in checkout). | proposed |
| Node.js 20+ is available in the runner/local environment. | proposed |

---

## Literal Mandates

| ID | Mandate | Source |
|----|---------|--------|
| **M1** | "System must run locally and easily configured in other repos for easy github action setup" | User Request |
| **M2** | "Make sure we use Keel [v2 workflow]" | User Request |
| **M3** | "Must use Google AI Pro / Gemini credentials to avoid using Claude usage" | User Request |

---

## Out of Scope (Explicit)

- Full SAST language compiler reimplementation (we delegate to lightweight SAST/Semgrep or AST regex matchers).
- Paid SaaS backend hosting or database dependencies (stateless CLI + Action only).

---

## Open Questions

- [ ] Should `fail-on-severity` default to `HIGH` or `CRITICAL` for blocking CI builds? *(Proposed default: `HIGH`)*

---

## G1 — Requirements Lock Checklist

- [x] Clarify loop completed — requirements defined from user request and research.
- [x] Literal Mandates table populated (`M1`, `M2`, `M3`).
- [x] Every requirement has an ID and acceptance criteria (`R1`–`R6`, `N1`–`N5`).
- [x] Out-of-scope list is explicit.
- [ ] **Human Sign-off (G1)**: User review required to lock Phase 1 requirements before proceeding to Phase 2 (High-Level Design).
