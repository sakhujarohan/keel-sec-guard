import type { AuditResult } from './llm.js';
import type { SASTFinding } from './sast.js';
export interface AuditRunArtifacts {
    timestamp: string;
    targetBranch: string;
    model: string;
    diffStats: {
        filesChanged: string[];
        lineCount: number;
        isTruncated: boolean;
    };
    sastFindingsCount: number;
    sastFindings: SASTFinding[];
    geminiStatus: 'SUCCESS' | 'SKIPPED_NO_KEY' | 'FAILED_API_ERROR';
    geminiAuditResult: AuditResult;
    passed: boolean;
    failOnThreshold: string;
    logs: string[];
}
export declare function writeRunArtifacts(outputDir: string, markdownReport: string, artifacts: AuditRunArtifacts): void;
