import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
export async function installGitHook(options) {
    const { repoRoot, hookType = 'pre-push', branch = 'main', failOn = 'HIGH' } = options;
    const hookPath = join(repoRoot, '.git', 'hooks', hookType);
    const exists = await stat(hookPath).then(() => true, () => false);
    const scriptContent = `#!/bin/sh
# Installed by keel-sec-guard
# Runs a local security audit before ${hookType === 'pre-push' ? 'pushing' : 'committing'}
npx keel-sec-guard audit --branch ${branch} --fail-on ${failOn}
`;
    await mkdir(dirname(hookPath), { recursive: true });
    await writeFile(hookPath, scriptContent, { mode: 0o755 });
    return { path: `.git/hooks/${hookType}`, created: !exists };
}
