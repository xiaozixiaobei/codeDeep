import { useEffect, useRef } from 'react';
import { Message, Attachment } from '../types/chat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Sparkles, Code, Terminal, FileText, Bug, Square, Loader2 } from 'lucide-react';
import { FileOp } from '../services/fileOps';
import { PermissionLevel } from '../types/project';

interface ChatAreaProps {
  messages: Message[];
  onSend: (message: string, attachments?: Attachment[]) => void;
  onClear?: () => void;
  onStop?: () => void;
  isLoading: boolean;
  onApplyFileOp?: (op: FileOp) => Promise<void>;
  workspacePath?: string | null;
  onSetWorkspace?: (path: string) => void;
  permissionLevel?: PermissionLevel;
  onTogglePermission?: (level: PermissionLevel) => void;
}

const suggestions = [
  { icon: Code, text: '写一个 React Hook', prompt: '帮我写一个自定义 React Hook，用于管理表单状态' },
  { icon: Terminal, text: '运行命令', prompt: '运行 npm install 安装依赖' },
  { icon: FileText, text: '解释代码', prompt: '解释一下这段代码的作用' },
  { icon: Bug, text: '修复 Bug', prompt: '帮我找出并修复这个 bug' },
];

export function ChatArea({ messages, onSend, onClear, onStop, isLoading, onApplyFileOp, workspacePath, onSetWorkspace, permissionLevel = 'important', onTogglePermission }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full px-8">
            <div className="w-full max-w-lg text-center">
              {/* Logo */}
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mb-5 shadow-lg shadow-blue-500/20">
                <Sparkles size={24} className="text-white" />
              </div>

              <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1.5">
                有什么可以帮你的？
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                我是你的 AI 编程助手，可以帮你写代码、调试、重构
              </p>

              {/* Suggestions */}
              <div className="grid grid-cols-2 gap-1.5">
                {suggestions.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => onSend(item.prompt)}
                    className="flex items-center gap-2.5 px-4 h-[48px] rounded-lg border border-[var(--border)] hover:border-[var(--border-light)] hover:bg-[var(--bg-secondary)] text-left transition-all duration-200 group"
                  >
                    <item.icon size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] flex-shrink-0" />
                    <span className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-3 flex flex-col gap-2">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} onApplyFileOp={onApplyFileOp} workspacePath={workspacePath} permissionLevel={permissionLevel} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="py-2">
                <div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">CodeDeep</div>
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 size={14} className="text-[var(--text-tertiary)] animate-spin" />
                        <span className="text-sm text-[var(--text-tertiary)]">思考中...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Stop button */}
      {isLoading && onStop && (
        <div className="flex justify-center py-2">
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-4 h-8 rounded-full border border-[var(--border)] bg-white hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs transition-colors shadow-sm"
          >
            <Square size={12} fill="currentColor" />
            <span>停止生成</span>
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={onSend}
        onClear={onClear}
        disabled={isLoading}
        workspacePath={workspacePath}
        onSetWorkspace={onSetWorkspace}
        permissionLevel={permissionLevel}
        onTogglePermission={onTogglePermission}
      />
    </div>
  );
}
