import { execSync } from 'node:child_process';

export interface DiffPayload {
  rawDiff: string;
  filesChanged: string[];
  lineCount: number;
  isTruncated: boolean;
}

export function extractDiff(targetBranch = 'main', maxCharacters = 50000): DiffPayload {
  try {
    const rawDiffOutput = execSync(`git diff origin/${targetBranch}...HEAD`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    const lines = rawDiffOutput.split('\n');
    const filesChanged: string[] = [];
    const filteredDiffLines: string[] = [];
    let currentFileIgnored = false;

    const ignoredExtensions = ['.lock', '.json', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.min.js', '.min.css'];

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const fileMatch = line.match(/b\/(.+)$/);
        const filePath = fileMatch ? fileMatch[1] : '';
        currentFileIgnored = ignoredExtensions.some((ext) => filePath.endsWith(ext));

        if (!currentFileIgnored && filePath) {
          filesChanged.push(filePath);
        }
      }

      if (!currentFileIgnored) {
        filteredDiffLines.push(line);
      }
    }

    const filteredDiff = filteredDiffLines.join('\n');
    const isTruncated = filteredDiff.length > maxCharacters;
    const finalDiff = isTruncated ? filteredDiff.substring(0, maxCharacters) : filteredDiff;

    return {
      rawDiff: finalDiff,
      filesChanged,
      lineCount: filteredDiffLines.length,
      isTruncated,
    };
  } catch (error) {
    return {
      rawDiff: '',
      filesChanged: [],
      lineCount: 0,
      isTruncated: false,
    };
  }
}
