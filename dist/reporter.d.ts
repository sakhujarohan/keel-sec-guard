import type { AuditResult } from './llm.js';
import type { SASTFinding } from './sast.js';
export declare function formatMarkdownReport(auditResult: AuditResult, sastFindings: SASTFinding[]): string;
