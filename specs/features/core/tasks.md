---
artifact: tasks
phase: 6
gate: "—"
status: signed-off
updated: 2026-07-21
---

# Tasks — keel-sec-guard (`feature-core`)

**Run:** keel-sec-guard · **LLD:** [`./lld.md`](specs/keel-sec-guard/features/core/lld.md)

---

## Wave 1 — Setup & Core Engines (Independent)

### T1 — Initialize Target Standalone Repository & Package Config
- **Goal:** Create standalone workspace at `.` with `package.json`, `tsconfig.json`, `biome.json`, and Vitest setup.
- **Done when:** `npm run check` passes cleanly inside `.`.
- **Files:** `./package.json`, `tsconfig.json`, `biome.json` · **Depends on:** — · **Satisfies:** M1, M2

### T2 — Build DiffExtractor Module
- **Goal:** Parse `git diff` output, filtering lockfiles and binary assets, returning `DiffPayload`.
- **Done when:** Unit test verifies lockfiles are stripped and token truncation works.
- **Files:** `./src/diff.ts`, `tests/diff.test.ts` · **Depends on:** T1 · **Satisfies:** R1

### T3 — Build SASTScanner Module
- **Goal:** Detect high-entropy strings, hardcoded secrets, and OWASP Top 10 AST regex patterns.
- **Done when:** Unit test correctly flags hardcoded API keys and unsafe SQL strings.
- **Files:** `./src/sast.ts`, `tests/sast.test.ts` · **Depends on:** T1 · **Satisfies:** R2

## Wave 2 — LLM Integration & Formatting

### T4 — Build GeminiAuditor Module (`@google/genai`)
- **Goal:** Connect to Google Gemini 2.5 API using `@google/genai` SDK and submit diff + SAST context.
- **Done when:** Mocked/live test returns structured security risk scores (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Files:** `./src/llm.ts`, `tests/llm.test.ts` · **Depends on:** T2, T3 · **Satisfies:** R3, M3

### T5 — Build ReportGenerator Module
- **Goal:** Format SAST findings and Gemini analysis into standardized Markdown output.
- **Done when:** Generated Markdown string includes severity headers, issue details, and fix recommendations.
- **Files:** `./src/reporter.ts`, `tests/reporter.test.ts` · **Depends on:** T4 · **Satisfies:** R4, R5

## Wave 3 — Adapters & Packaging

### T6 — Build CLI Adapter & `SKILL.md` Agent Integration
- **Goal:** Provide CLI executable (`src/cli.ts`) for `npx keel-sec-guard` and create `SKILL.md`.
- **Done when:** Executing CLI on local git repo outputs colored security report and proper exit code.
- **Files:** `./src/cli.ts`, `SKILL.md` · **Depends on:** T5 · **Satisfies:** R5

### T7 — Build GitHub Action Composite Definition (`action.yml`) & Action Entrypoint
- **Goal:** Provide `action.yml` and `src/action.ts` for GitHub PR integration.
- **Done when:** `action.yml` correctly invokes Node runner and posts PR comment via `@actions/github`.
- **Files:** `./action.yml`, `src/action.ts` · **Depends on:** T5 · **Satisfies:** R4, R6
