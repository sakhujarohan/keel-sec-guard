---
artifact: stack
phase: 3
gate: G3
status: signed-off
updated: 2026-07-21
---

# Stack Selection — keel-sec-guard

**Status:** DRAFT · **Drivers:** NFRs in [`requirements.md`](specs/keel-sec-guard/requirements.md), HLD in [`hld.md`](specs/keel-sec-guard/hld.md)

---

## Decisions

| Choice | Candidates Considered | Decision | Driver (NFR / Constraint) | ADR |
|--------|-----------------------|----------|---------------------------|-----|
| **Language** | TypeScript, Python, Go | **TypeScript (ESM)** | Matches Keel ecosystem, native Node.js support in GitHub Actions (N4, Mandate M1). | — |
| **SDK / LLM Client** | `@google/genai`, `@google/generative-ai`, LangChain | **`@google/genai`** | Official modern Google GenAI SDK supporting Gemini 2.5 Flash/Pro models (Mandate M3). | — |
| **GitHub Action Integration** | `@actions/core`, `@actions/github` | **`@actions/core` + `@actions/github`** | Official GitHub Action toolkit for reading inputs and calling GitHub Octokit API (R4). | — |
| **CLI Framework** | `commander`, `yargs`, `cac` | **`commander`** | Lightweight, typed CLI parser matching `@keel-dev/cli` patterns (R5). | — |
| **Formatting / Linter** | Biome, ESLint + Prettier | **Biome (`@biomejs/biome`)** | Blazing fast single-binary formatting & linting. | — |
| **Testing Framework** | Vitest, Jest | **Vitest** | Native ESM & TypeScript support with ultra-fast execution. | — |

---

## Known Trade-offs & Risks

1. **Gemini API Rate Limits**: Free-tier Gemini AI Studio accounts have per-minute request limits. *Mitigation*: Implement exponential backoff retry in `GeminiAuditor`.
2. **Git Executable Dependency**: Local CLI execution relies on `git` binary installed in system PATH. *Mitigation*: Provide helpful error message if `git` is missing.

---

## G3 — Stack Lock Checklist

- [x] Every major choice traced to a driver (TypeScript, `@google/genai`, Commander, Biome, Vitest).
- [x] Trade-offs and risks documented with mitigations.
- [ ] **Human Sign-off (G3)**: User review required to lock stack.
