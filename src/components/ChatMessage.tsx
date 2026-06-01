import { Message } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Sparkles, User, Play, Loader2, Terminal } from 'lucide-react';
import { useState, useMemo } from 'react';
import { executeCommand, CommandResult } from '../services/shell';
import { parseFileOps, FileOp } from '../services/fileOps';
import { PermissionLevel } from '../types/project';
import { confirm } from '@tauri-apps/plugin-dialog';
import { FileOpCard } from './FileOpCard';

interface ChatMessageProps {
  message: Message;
  onApplyFileOp?: (op: FileOp) => Promise<void>;
  workspacePath?: string | null;
  permissionLevel?: PermissionLevel;
}

const SHELL_LANGS = ['bash', 'sh', 'shell', 'zsh', 'powershell', 'cmd', 'bat'];

const DANGEROUS_CMD_PATTERNS: RegExp[] = [
  /\brm\s+(-[a-zA-Z]*r|--recursive)/,       // rm -rf, rm -r
  /\bmkfs\b/,                                  // mkfs — 格式化磁盘
  /\bdd\s+if=/,                                // dd if= — 磁盘写入
  /\bgit\s+push\s+.*--force/,                  // git push --force
  /\bgit\s+reset\s+--hard/,                    // git reset --hard
  /\b(curl|wget)\s.*\|\s*(sh|bash|zsh)/,      // curl | sh
  /\bchmod\s+777/,                             // chmod 777
  /\b(DROP\s+TABLE|DELETE\s+FROM|TRUNCATE)\b/i, // SQL 危险操作
  /\b(rm\s+-[a-zA-Z]*f|--force)\b.*\*/,        // rm -f with glob
  />\s*\/dev\/sd/,                              // 写入磁盘设备
];

function isDangerousCommand(cmd: string): boolean {
  return DANGEROUS_CMD_PATTERNS.some((pattern) => pattern.test(cmd));
}

export function ChatMessage({ message, onApplyFileOp, workspacePath, permissionLevel = 'important' }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [runningCmds, setRunningCmds] = useState<Record<string, boolean>>({});
  const [cmdResults, setCmdResults] = useState<Record<string, CommandResult>>({});
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'applying'>('idle');
  const parsed = useMemo(() => {
    if (isUser) return null;
    return parseFileOps(message.content, message.id);
  }, [message.content, message.id, isUser]);

  const hasFileOps = parsed && parsed.segments.some((s) => s.type === 'fileop');
  const fileOpCount = parsed ? parsed.segments.filter((s) => s.type === 'fileop').length : 0;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async (code: string, key: string) => {
    if (isDangerousCommand(code) && permissionLevel === 'important') {
      const confirmed = await confirm(
        `此命令可能有风险，确定执行？\n\n${code.slice(0, 200)}`,
        { title: '危险命令确认', kind: 'warning' }
      );
      if (!confirmed) return;
    }
    setRunningCmds((prev) => ({ ...prev, [key]: true }));
    setCmdResults((prev) => ({ ...prev, [key]: { code: -1, stdout: '', stderr: '' } }));
    try {
      const result = await executeCommand(code, workspacePath ?? undefined);
      setCmdResults((prev) => ({ ...prev, [key]: result }));
    } catch (err: any) {
      setCmdResults((prev) => ({ ...prev, [key]: { code: 1, stdout: '', stderr: err.message || '命令执行异常' } }));
    } finally {
      setRunningCmds((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleApply = async (op: FileOp) => {
    if (onApplyFileOp) await onApplyFileOp(op);
  };

  const handleApplyAll = async () => {
    const confirmed = await confirm(
      `确定应用全部 ${fileOpCount} 个文件操作？`,
      { title: '批量操作确认', kind: 'warning' }
    );
    if (!confirmed) return;

    setBatchStatus('applying');
    for (const seg of parsed!.segments) {
      if (seg.type === 'fileop') {
        await handleApply(seg.op);
      }
    }
    setBatchStatus('idle');
  };

  const handleSkip = (_opId: string) => {};

  if (isUser) {
    return (
      <div className="py-2">
        <div className="flex justify-end">
          <div className="flex items-end gap-2.5 max-w-[75%]">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-1 text-right">你</div>
              {/* Attached images */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
                  {message.attachments.map((att, i) => (
                    <img
                      key={i}
                      src={att.dataUrl}
                      alt={att.name}
                      className="max-w-[200px] max-h-[150px] object-cover rounded-lg border border-white/20"
                    />
                  ))}
                </div>
              )}
              {message.content && (
                <div className="bg-[var(--accent)] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderMarkdown = (text: string) => (
    <ReactMarkdown components={markdownComponents(message, cmdResults, runningCmds, handleRun, handleCopy, copied)}>
      {text}
    </ReactMarkdown>
  );

  return (
    <div className="px-6 py-2">
      <div>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">CodeDeep</div>
            {/* Thinking section */}
            {message.thinking && (
              <div className="mb-2">
                <button
                  onClick={() => setThinkingExpanded(!thinkingExpanded)}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${thinkingExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>思考过程</span>
                </button>
                {thinkingExpanded && (
                  <div className="mt-1.5 pl-4 border-l-2 border-[var(--border)] text-[var(--text-secondary)] text-sm leading-relaxed">
                    {renderMarkdown(message.thinking)}
                  </div>
                )}
              </div>
            )}
            {/* Loading state when no content yet */}
            {!message.content && !message.thinking && (
              <div className="flex items-center gap-2 py-1">
                <Loader2 size={14} className="text-[var(--text-tertiary)] animate-spin" />
                <span className="text-sm text-[var(--text-tertiary)]">思考中...</span>
              </div>
            )}
            {/* Content */}
            {message.content && (
              <div className="text-[var(--text-primary)] leading-relaxed">
                {hasFileOps ? (
                  <>
                    <div className="prose prose-sm max-w-none">
                      {parsed!.segments.map((seg, i) =>
                        seg.type === 'text' ? (
                          <div key={i}>{renderMarkdown(seg.content)}</div>
                        ) : (
                          <FileOpCard
                            key={seg.op.id}
                            op={seg.op}
                            workspacePath={workspacePath}
                            onApply={handleApply}
                            onSkip={handleSkip}
                          />
                        )
                      )}
                    </div>
                    {/* Batch apply button - below file ops */}
                    {fileOpCount > 1 && batchStatus === 'idle' && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={handleApplyAll}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white bg-[var(--accent)] hover:bg-[var(--accent-dark)] transition-colors"
                        >
                          <Check size={13} />
                          <span>全部应用 ({fileOpCount} 个文件)</span>
                        </button>
                      </div>
                    )}
                    {batchStatus === 'applying' && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                        <Loader2 size={13} className="animate-spin" />
                        <span>正在批量应用...</span>
                      </div>
                    )}
                  </>
                ) : (
                  renderMarkdown(message.content)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function markdownComponents(
  message: Message,
  cmdResults: Record<string, CommandResult>,
  runningCmds: Record<string, boolean>,
  handleRun: (code: string, key: string) => void,
  handleCopy: (text: string) => void,
  copied: boolean,
) {
  return {
    code({ className, children, ref, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      const isShell = match && SHELL_LANGS.includes(match[1].toLowerCase());
      const cmdKey = `${message.id}-${codeString.slice(0, 20)}`;

      if (match) {
        const result = cmdResults[cmdKey];
        const running = runningCmds[cmdKey];

        return (
          <div className="my-2 rounded-lg overflow-hidden border border-[var(--border)]">
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] text-xs text-[var(--text-tertiary)]">
              <span>{match[1]}</span>
              <div className="flex items-center gap-2">
                {isShell && (
                  <button onClick={() => handleRun(codeString, cmdKey)} disabled={running}
                    className={`flex items-center gap-1 transition-colors ${running ? 'text-[var(--accent)] cursor-not-allowed' : 'hover:text-[var(--accent)]'}`}>
                    {running
                      ? <><Loader2 size={12} className="animate-spin" /><span>运行中...</span></>
                      : <><Play size={12} /><span>运行</span></>}
                  </button>
                )}
                <button onClick={() => handleCopy(codeString)}
                  className="flex items-center gap-1 hover:text-[var(--text-secondary)] transition-colors">
                  {copied
                    ? <><Check size={12} /><span>已复制</span></>
                    : <><Copy size={12} /><span>复制</span></>}
                </button>
              </div>
            </div>
            <SyntaxHighlighter style={oneLight} language={match[1]} PreTag="div"
              customStyle={{ margin: 0, borderRadius: 0, padding: '14px 16px', fontSize: '13px', lineHeight: '1.6', background: '#f9fafb' }}>
              {codeString}
            </SyntaxHighlighter>
            {result && result.code !== -1 && (
              <div className="border-t border-[var(--border)]">
                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--bg-secondary)] text-xs text-[var(--text-tertiary)]">
                  <Terminal size={12} />
                  <span>执行结果 {result.code !== 0 && `(退出码: ${result.code})`}</span>
                </div>
                <pre className="px-4 py-2 text-[12px] leading-relaxed overflow-x-auto bg-[#fafafa]">
                  {result.stdout && <div className="text-[var(--text-primary)]">{result.stdout}</div>}
                  {result.stderr && <div className="text-red-500">{result.stderr}</div>}
                  {!result.stdout && !result.stderr && <div className="text-[var(--text-tertiary)]">（无输出）</div>}
                </pre>
              </div>
            )}
          </div>
        );
      }

      return (
        <code className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent-light)] text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    p({ children }: any) { return <p className="mb-2 last:mb-0">{children}</p>; },
    ul({ children }: any) { return <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>; },
    ol({ children }: any) { return <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>; },
    blockquote({ children }: any) {
      return <blockquote className="border-l-2 border-[var(--accent)] pl-3 my-2 text-[var(--text-secondary)] italic">{children}</blockquote>;
    },
    h1({ children }: any) { return <h1 className="text-lg font-semibold mb-2 mt-3">{children}</h1>; },
    h2({ children }: any) { return <h2 className="text-base font-semibold mb-1.5 mt-2.5">{children}</h2>; },
    h3({ children }: any) { return <h3 className="text-sm font-semibold mb-1.5 mt-2">{children}</h3>; },
    a({ href, children }: any) {
      return <a href={href} className="text-[var(--accent)] hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
    },
  };
}
