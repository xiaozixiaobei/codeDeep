import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, FolderOpen, X, Shield, ChevronUp, ImagePlus } from 'lucide-react';
import { SlashCommand, filterCommands, SLASH_COMMANDS } from '../services/slashCommands';
import { PermissionLevel } from '../types/project';
import { Attachment } from '../types/chat';

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  onClear?: () => void;
  disabled?: boolean;
  workspacePath?: string | null;
  onSetWorkspace?: (path: string) => void;
  permissionLevel?: PermissionLevel;
  onTogglePermission?: (level: PermissionLevel) => void;
}

const PERMISSION_OPTIONS: { value: PermissionLevel; label: string; desc: string }[] = [
  { value: 'important', label: '默认权限', desc: '危险操作需确认' },
  { value: 'review', label: '自动审核', desc: '仅删除需确认' },
  { value: 'full', label: '完全访问', desc: '仅删除需确认' },
];

export function ChatInput({ onSend, onClear, disabled, workspacePath, onSetWorkspace, permissionLevel = 'important', onTogglePermission }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [workspaceInput, setWorkspaceInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [menuFilter, setMenuFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPermMenu, setShowPermMenu] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const permMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = filterCommands(menuFilter);
  const currentPerm = PERMISSION_OPTIONS.find((o) => o.value === permissionLevel) ?? PERMISSION_OPTIONS[0];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => { setSelectedIndex(0); }, [menuFilter]);

  useEffect(() => {
    if (!showPermMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (permMenuRef.current && !permMenuRef.current.contains(e.target as Node)) {
        setShowPermMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPermMenu]);

  const detectSlashMenu = useCallback((value: string) => {
    if (value.startsWith('/') && !value.includes('\n')) {
      const query = value.slice(1);
      setShowMenu(true);
      setMenuFilter(query);
    } else {
      setShowMenu(false);
      setMenuFilter('');
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    detectSlashMenu(value);
  };

  const selectCommand = (cmd: SlashCommand) => {
    if (cmd.action === 'clear') {
      onClear?.();
      setInput('');
      setShowMenu(false);
      return;
    }
    setInput(`/${cmd.name} `);
    setShowMenu(false);
    textareaRef.current?.focus();
  };

  const resolveCommand = (text: string): string => {
    const match = text.match(/^\/(\w+)\s*([\s\S]*)$/);
    if (!match) return text;
    const cmdName = match[1];
    const userContent = match[2].trim();
    const cmd = SLASH_COMMANDS.find((c) => c.name === cmdName && !c.action);
    if (!cmd) return text;
    return (cmd.prompt || '') + userContent;
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addFiles = async (files: FileList | File[]) => {
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 20 * 1024 * 1024) continue; // 20MB limit
      const dataUrl = await readFileAsDataUrl(file);
      newAttachments.push({ type: 'image', name: file.name, dataUrl });
    }
    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      await addFiles(imageFiles);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await addFiles(e.target.files);
    }
    // Reset so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if ((trimmed || attachments.length > 0) && !disabled) {
      const resolved = trimmed ? resolveCommand(trimmed) : '';
      onSend(resolved, attachments.length > 0 ? attachments : undefined);
      setInput('');
      setAttachments([]);
      setShowMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          selectCommand(filteredCommands[selectedIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      await addFiles(e.dataTransfer.files);
    }
  };

  const handleWorkspaceSubmit = () => {
    const trimmed = workspaceInput.trim();
    if (trimmed && onSetWorkspace) {
      onSetWorkspace(trimmed);
    }
    setEditingWorkspace(false);
  };

  const permColors: Record<PermissionLevel, string> = {
    important: 'text-amber-500',
    review: 'text-blue-500',
    full: 'text-emerald-500',
  };

  return (
    <div
      className="border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-4 relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Slash command menu */}
      {showMenu && filteredCommands.length > 0 && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-6 right-6 mb-2 bg-white rounded-xl border border-[var(--border)] shadow-lg overflow-hidden max-h-[320px] overflow-y-auto z-50"
        >
          <div className="px-3 py-2 text-[11px] text-[var(--text-tertiary)] border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            {menuFilter ? `搜索: /${menuFilter}` : '快捷命令'}
          </div>
          {filteredCommands.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.name}
                onClick={() => selectCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  i === selectedIndex
                    ? 'bg-[var(--bg-hover)]'
                    : 'hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  cmd.category === 'action'
                    ? 'bg-red-50 text-red-500'
                    : 'bg-blue-50 text-blue-500'
                }`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">
                    /{cmd.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                    {cmd.description}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  cmd.category === 'action'
                    ? 'bg-red-50 text-red-400'
                    : 'bg-blue-50 text-blue-400'
                }`}>
                  {cmd.category === 'action' ? '操作' : '技能'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Workspace indicator */}
      {workspacePath && !editingWorkspace && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <FolderOpen size={13} className="text-[var(--text-tertiary)]" />
          <span className="text-xs text-[var(--text-tertiary)] truncate">{workspacePath}</span>
          <button onClick={() => { setEditingWorkspace(true); setWorkspaceInput(workspacePath); }}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors ml-1">
            更改
          </button>
          <button onClick={() => onSetWorkspace?.('')}
            className="text-[var(--text-tertiary)] hover:text-red-500 transition-colors">
            <X size={12} />
          </button>
        </div>
      )}
      {editingWorkspace && (
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen size={13} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            value={workspaceInput}
            onChange={(e) => setWorkspaceInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleWorkspaceSubmit(); if (e.key === 'Escape') setEditingWorkspace(false); }}
            placeholder="输入项目目录路径，如 /Users/you/project"
            autoFocus
            className="flex-1 h-7 px-2 rounded border border-[var(--border)] bg-white text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button onClick={handleWorkspaceSubmit}
            className="px-2 h-7 rounded text-xs text-white bg-[var(--accent)] hover:bg-[var(--accent-dark)] transition-colors">
            确定
          </button>
          <button onClick={() => setEditingWorkspace(false)}
            className="px-2 h-7 rounded text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
            取消
          </button>
        </div>
      )}

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] focus-within:border-[var(--border-light)] transition-colors">
        {/* Images inside input box */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-0 overflow-x-auto">
            {attachments.map((att, i) => (
              <div key={i} className="relative flex-shrink-0 group">
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  className="h-20 rounded-lg object-cover"
                />
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end p-2.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={attachments.length > 0 ? "添加说明... (可选)" : "给 CodeDeep 发送消息... (输入 / 查看快捷命令)"}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none outline-none py-1 max-h-[200px] text-[14px] leading-[1.5] min-h-[44px]"
          />
          <div className="flex items-center gap-0.5 ml-2">
            {/* Upload image button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            title="上传图片"
          >
            <ImagePlus size={16} className="text-[var(--text-tertiary)]" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Permission dropdown */}
          {onTogglePermission && (
            <div className="relative" ref={permMenuRef}>
              <button
                onClick={() => setShowPermMenu(!showPermMenu)}
                className="h-[32px] px-2 flex items-center gap-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                title="权限设置"
              >
                <Shield size={13} className={permColors[permissionLevel]} />
                <span className="text-[11px] text-[var(--text-tertiary)]">{currentPerm.label}</span>
                <ChevronUp size={11} className={`text-[var(--text-tertiary)] transition-transform ${showPermMenu ? '' : 'rotate-180'}`} />
              </button>
              {showPermMenu && (
                <div className="absolute bottom-full right-0 mb-1 w-[180px] bg-white rounded-lg border border-[var(--border)] shadow-lg overflow-hidden z-50">
                  {PERMISSION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onTogglePermission(opt.value);
                        setShowPermMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                        permissionLevel === opt.value
                          ? 'bg-[var(--bg-hover)]'
                          : 'hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <Shield size={13} className={permColors[opt.value]} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-[var(--text-primary)]">{opt.label}</div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">{opt.desc}</div>
                      </div>
                      {permissionLevel === opt.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!workspacePath && (
            <button
              onClick={() => setEditingWorkspace(true)}
              className="w-[32px] h-[32px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              title="设置工作区"
            >
              <FolderOpen size={16} className="text-[var(--text-tertiary)]" />
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={disabled || (!input.trim() && attachments.length === 0)}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
