import type { DiffPayload } from './diff.js';
import type { SASTFinding } from './sast.js';
export interface AuditResult {
    overallRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    summary: string;
    findings: Array<{
        title: string;
        severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
        file?: string;
        line?: number;
        description: string;
        recommendation: string;
    }>;
}
export declare function auditWithGemini(diffPayload: DiffPayload, sastFindings: SASTFinding[], apiKeyInput?: string | string[], modelName?: string, maxRetries?: number, anthropicApiKey?: string): Promise<AuditResult>;
