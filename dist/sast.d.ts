import type { DiffPayload } from './diff.js';
export interface SASTFinding {
    file: string;
    line?: number;
    ruleId: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    snippet?: string;
}
export declare function scanDiff(diffPayload: DiffPayload): SASTFinding[];
