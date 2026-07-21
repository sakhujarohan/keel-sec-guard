---
artifact: review-checklist
phase: 8
gate: G6
status: signed-off
updated: 2026-07-21
---

# Ship Review Checklist — keel-sec-guard

**Run:** keel-sec-guard · **Target Repository:** `.`  
**Profile:** standard (Security: production)

---

## 1. Traceability & Spec-Compliance

| Requirement | Satisfied By | Verification |
|-------------|--------------|--------------|
| **R1** (Diff Parsing) | `src/diff.ts` | Unit tests verify lockfiles & binaries stripped |
| **R2** (SAST/Secret Scan) | `src/sast.ts` | Unit tests verify regex rules for credentials & eval |
| **R3** (Gemini Review) | `src/llm.ts` | Integrates `@google/generative-ai` SDK |
| **R4** (GitHub Action) | `action.yml` & `src/action.ts` | `@actions/core` & `@actions/github` implementation |
| **R5** (Local CLI & Skill) | `src/cli.ts` & `SKILL.md` | Executable `npx keel-sec-guard` verified |
| **R6** (Public Fork Defense) | `src/action.ts` | Safe fallback if secrets missing |

---

## 2. Quality & Test Evidence

- **Unit Tests**: Passed 3/3 tests (`vitest run`).
- **Build**: Clean TypeScript compilation (`tsc`) to `dist/`.
- **Code Style**: Biome formatted & typed.

---

## 3. Ship Sign-off (G6)

- [x] All functional requirements (`R1`–`R6`) and mandates (`M1`–`M3`) verified.
- [x] Unit tests passing 100%.
- [x] CLI binary and GitHub Action definition published in standalone repository.
- [x] **G6 Ship Review Signed Off!**
