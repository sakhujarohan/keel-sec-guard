export interface HookOptions {
    repoRoot: string;
    hookType?: 'pre-commit' | 'pre-push';
    branch?: string;
    failOn?: string;
}
export declare function installGitHook(options: HookOptions): Promise<{
    path: string;
    created: boolean;
}>;
