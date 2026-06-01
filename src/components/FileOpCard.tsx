import { useState, useEffect } from 'react';
import { FilePlus, FileEdit, Trash2, Check, X, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { FileOp, computeDiff } from '../services/fileOps';
import { readFile } from '../services/fs';
import { executeCommand } from '../services/shell';

interface FileOpCardProps {
  op: FileOp;
  workspacePath?: string | null;
  onApply: (op: FileOp) => Promise<void>;
  onSkip: (opId: string) => void;
}

const actionConfig = {
  create: { label: '创建', icon: FilePlus, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  write: { label: '修改', icon: FileEdit, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  delete: { label: '删除', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

function countChangedLines(content: string): number {
  return content.split('\n').length;
}

async function openInEditor(filePath: string) {
  // Try VS Code first, then fallback to system default
  await executeCommand(`code "${filePath}"`).catch(() => {});
}

export function FileOpCard({ op, workspacePath, onApply, onSkip }: FileOpCardProps) {
  const [status, setStatus] = useState<'pending' | 'applying' | 'applied' | 'skipped' | 'error'>('pending');
  const [showDetail, setShowDetail] = useState(false);
  const [diffStats, setDiffStats] = useState<{ added: number; removed: number } | null>(null);
  const config = actionConfig[op.action];
  const Icon = config.icon;

  const lineCount = op.content ? countChangedLines(op.content) : 0;

  useEffect(() => {
    if (!workspacePath || !op.content) return;
    if (op.action === 'create') {
      setDiffStats({ added: lineCount, removed: 0 });
      return;
    }
    if (op.action === 'delete') {
      readFile(`${workspacePath}/${op.path}`).then((res) => {
        if (res.success && res.data) {
          setDiffStats({ added: 0, removed: res.data.split('\n').length });
        } else {
          setDiffStats({ added: 0, removed: 0 });
        }
      });
      return;
    }
    readFile(`${workspacePath}/${op.path}`).then((res) => {
      const oldContent = res.success && res.data ? res.data : '';
      const diff = computeDiff(oldContent, op.content!);
      const added = diff.filter((d) => d.type === 'add').length;
      const removed = diff.filter((d) => d.type === 'remove').length;
      setDiffStats({ added, removed });
    });
  }, [workspacePath, op.path, op.action, op.content]);

  const fullPath = workspacePath ? `${workspacePath}/${op.path}` : op.path;

  const handleApply = async () => {
    setStatus('applying');
    try {
      await onApply(op);
      setStatus(op.error ? 'error' : 'applied');
    } catch {
      setStatus('error');
    }
  };

  const handleSkip = () => {
    setStatus('skipped');
    onSkip(op.id);
  };

  const handleOpenInEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    openInEditor(fullPath);
  };

  // Applied/Skipped: compact one-line record
  if (status === 'applied' || status === 'skipped') {
    return (
      <div
        className="my-1.5 flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] transition-colors group cursor-pointer"
        onClick={handleOpenInEditor}
        title={`点击在编辑器中打开 ${fullPath}`}
      >
        {status === 'applied' ? (
          <Check size={14} className="text-emerald-600 flex-shrink-0" />
        ) : (
          <X size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
        )}
        <span className="text-[13px] font-mono text-[var(--text-primary)] truncate flex-1">
          {op.path}
        </span>
        {op.action !== 'delete' && diffStats && (
          <span className="text-[11px] flex-shrink-0 flex items-center gap-1">
            {diffStats.added > 0 && <span className="text-emerald-600">+{diffStats.added}</span>}
            {diffStats.removed > 0 && <span className="text-red-500">-{diffStats.removed}</span>}
            {diffStats.added === 0 && diffStats.removed === 0 && <span className="text-[var(--text-tertiary)]">{lineCount} 行</span>}
          </span>
        )}
        <span className={`text-[11px] px-1.5 py-0.5 rounded ${config.bg} ${config.color} flex-shrink-0`}>
          {config.label}
        </span>
        <ExternalLink size={12} className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    );
  }

  // Error: compact with error info
  if (status === 'error') {
    return (
      <div className="my-1.5 flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50">
        <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
        <span className="text-[13px] font-mono text-[var(--text-primary)] truncate flex-1">{op.path}</span>
        <span className="text-[11px] text-red-500 flex-shrink-0">{op.error || '失败'}</span>
      </div>
    );
  }

  // Pending/Applying: full card with preview
  return (
    <div className={`my-2 rounded-lg border ${config.border} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 ${config.bg}`}>
        <Icon size={15} className={config.color} />
        <span className="text-sm font-mono text-[var(--text-primary)] flex-1 truncate">{op.path}</span>
        {op.action !== 'delete' && diffStats && (
          <span className="text-[11px] flex items-center gap-1">
            {diffStats.added > 0 && <span className="text-emerald-600 font-medium">+{diffStats.added}</span>}
            {diffStats.removed > 0 && <span className="text-red-500 font-medium">-{diffStats.removed}</span>}
            {diffStats.added === 0 && diffStats.removed === 0 && <span className="text-[var(--text-tertiary)]">{lineCount} 行</span>}
          </span>
        )}
        {op.action === 'delete' && diffStats && diffStats.removed > 0 && (
          <span className="text-[11px] text-red-500 font-medium">-{diffStats.removed} 行</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
          {config.label}
        </span>
      </div>

      {/* Content preview (collapsible) */}
      {op.content && (
        <div>
          <button onClick={() => setShowDetail(!showDetail)}
            className="w-full px-4 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-[var(--bg-secondary)] border-t border-[var(--border)] transition-colors">
            {showDetail ? '收起预览' : '展开预览'}
          </button>
          {showDetail && (
            <pre className="px-4 py-2 text-[12px] leading-relaxed overflow-x-auto bg-[#fafafa] max-h-[300px] overflow-y-auto text-[var(--text-primary)]">
              {op.content.slice(0, 2000)}{op.content.length > 2000 ? '\n...' : ''}
            </pre>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-t border-[var(--border)]">
        {status === 'pending' && (
          <>
            <button onClick={handleApply}
              className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs text-white bg-[var(--accent)] hover:bg-[var(--accent-dark)] transition-colors">
              <Check size={13} />
              <span>应用</span>
            </button>
            <button onClick={handleSkip}
              className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
              <X size={13} />
              <span>跳过</span>
            </button>
          </>
        )}
        {status === 'applying' && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            <Loader2 size={13} className="animate-spin" />
            <span>正在应用...</span>
          </div>
        )}
      </div>
    </div>
  );
}
