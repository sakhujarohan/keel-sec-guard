# Stack Conventions — keel-sec-guard

- **Package Manager**: `npm`
- **Module System**: ES Modules (`"type": "module"`)
- **Code Style**: Biome (`npm run format`, `npm run check`)
- **Testing**: Vitest (`npm test`)
- **Node Target**: `>=20.0.0`

## Structure Rules
- Source code in `src/` inside the target standalone repository `.`.
- Single Responsibility Principle per module (`src/diff.ts`, `src/sast.ts`, `src/llm.ts`, `src/reporter.ts`).
- No hardcoded API keys or secrets anywhere in source code or test fixtures.
