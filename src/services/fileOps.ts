export type FileAction = 'write' | 'create' | 'delete';

export interface FileOp {
  id: string;
  path: string;
  action: FileAction;
  content?: string;
  applied?: boolean;
  error?: string;
}

interface ParseResult {
  segments: Array<{ type: 'text'; content: string } | { type: 'fileop'; op: FileOp }>;
}

const FILE_TAG_REGEX = /<file\s+path="([^"]+)"\s+action="(write|create|delete)"\s*>([\s\S]*?)<\/file>/g;

export function parseFileOps(content: string, messageId: string): ParseResult {
  const segments: ParseResult['segments'] = [];
  let lastIndex = 0;
  let opIndex = 0;

  for (const match of content.matchAll(FILE_TAG_REGEX)) {
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;

    if (matchStart > lastIndex) {
      const text = content.slice(lastIndex, matchStart);
      if (text.trim()) segments.push({ type: 'text', content: text });
    }

    segments.push({
      type: 'fileop',
      op: {
        id: `${messageId}-op-${opIndex++}`,
        path: match[1],
        action: match[2] as FileAction,
        content: match[3],
      },
    });

    lastIndex = matchEnd;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text.trim()) segments.push({ type: 'text', content: text });
  }

  return { segments };
}

export function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const result: DiffLine[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine === undefined) {
      result.push({ type: 'add', content: newLine! });
    } else if (newLine === undefined) {
      result.push({ type: 'remove', content: oldLine });
    } else if (oldLine !== newLine) {
      result.push({ type: 'remove', content: oldLine });
      result.push({ type: 'add', content: newLine });
    } else {
      result.push({ type: 'same', content: oldLine });
    }
  }

  return result;
}

export interface DiffLine {
  type: 'same' | 'add' | 'remove';
  content: string;
}

export function validateFilePath(filePath: string, workspacePath: string): { valid: boolean; error?: string } {
  // Reject absolute paths
  if (filePath.startsWith('/') || /^[A-Za-z]:\\/.test(filePath)) {
    return { valid: false, error: '不允许使用绝对路径' };
  }

  // Normalize: remove leading ./, collapse ../ and //
  const normalize = (p: string) => {
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        resolved.pop();
      } else if (part !== '.') {
        resolved.push(part);
      }
    }
    return '/' + resolved.join('/');
  };

  const normalizedWorkspace = normalize(workspacePath);
  const resolvedPath = normalize(`${workspacePath}/${filePath}`);

  if (!resolvedPath.startsWith(normalizedWorkspace + '/') && resolvedPath !== normalizedWorkspace) {
    return { valid: false, error: '路径超出工作区范围' };
  }

  return { valid: true };
}
