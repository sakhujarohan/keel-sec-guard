export interface DiffPayload {
    rawDiff: string;
    filesChanged: string[];
    lineCount: number;
    isTruncated: boolean;
}
export declare function extractDiff(targetBranch?: string, maxCharacters?: number): DiffPayload;
