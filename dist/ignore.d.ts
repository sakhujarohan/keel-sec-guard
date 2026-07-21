import type { AuditResult } from './llm.js';
import type { SASTFinding } from './sast.js';
export declare function loadIgnoreRules(ignoreFlag?: string, ignoreFile?: string): string[];
export declare function isIgnored(text: string, ignoreRules: string[]): boolean;
export declare function filterAuditResult(auditResult: AuditResult, ignoreRules: string[]): AuditResult;
export declare function filterSASTFindings(sastFindings: SASTFinding[], ignoreRules: string[]): SASTFinding[];
