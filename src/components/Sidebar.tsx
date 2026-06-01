import { useState } from 'react';
import { Conversation } from '../types/chat';
import { Project } from '../types/project';
import {
  Plus, MessageSquare, Settings, Trash2, Archive,
  FolderOpen, ChevronRight, ChevronDown, FolderPlus, Download, Search, X,
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  projects: Project[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: (projectId?: string) => void;
  onNewProject: () => void;
  onImportProject: () => void;
  onSettings: () => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export function Sidebar({
  conversations, projects, activeId, onSelect,
  onNewConversation, onNewProject, onImportProject,
  onSettings, onDelete, onArchive, onDeleteProject,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const matchesSearch = (conv: Conversation) =>
    !searchQuery || conv.title.toLowerCase().includes(searchQuery.toLowerCase());

  const standaloneConversations = conversations.filter((c) => !c.archived && !c.projectId && matchesSearch(c));

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getProjectConversations = (projectId: string) =>
    conversations.filter((c) => c.projectId === projectId && !c.archived && matchesSearch(c));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="pl-4 pr-[30px] pt-3 pb-2 flex gap-1.5">
        <button onClick={() => onNewConversation()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 h-[38px] rounded-lg border border-[var(--border-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-sm transition-all duration-200 group">
          <Plus size={15} className="text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          <span>新建对话</span>
        </button>
        <div className="relative">
          <button onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="h-[38px] px-2.5 rounded-lg border border-[var(--border-light)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-all duration-200"
            title="项目操作">
            <FolderPlus size={16} />
          </button>
          {showProjectMenu && (
            <div className="absolute top-full right-0 mt-1 w-[160px] bg-white rounded-lg shadow-lg border border-[var(--border)] py-1 z-50">
              <button onClick={() => { onNewProject(); setShowProjectMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                <FolderPlus size={14} /><span>新建项目</span>
              </button>
              <button onClick={() => { onImportProject(); setShowProjectMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                <Download size={14} /><span>导入项目</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
          <Search size={13} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="flex-1 bg-transparent text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pl-3 pr-[30px]">
        {/* Standalone conversations */}
        {standaloneConversations.length > 0 && (
          <div className="mb-3">
            <div className="px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              对话
            </div>
            <ul className="flex flex-col gap-1 list-none">
              {standaloneConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  active={activeId === conv.id}
                  hovered={hoveredId === conv.id}
                  onHover={setHoveredId}
                  onSelect={onSelect}
                  onArchive={onArchive}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div className="mb-3">
            <div className="px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              项目
            </div>
            <ul className="flex flex-col gap-1 list-none">
              {projects.map((project) => {
                const expanded = expandedProjects.has(project.id);
                const projectConvs = getProjectConversations(project.id);
                return (
                  <li key={project.id}>
                    <div
                      onClick={() => toggleProject(project.id)}
                      onMouseEnter={() => setHoveredId(`project-${project.id}`)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="flex items-center gap-2 p-2.5 rounded-lg text-[13px] cursor-pointer transition-all duration-150 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] group"
                    >
                      {expanded
                        ? <ChevronDown size={14} className="flex-shrink-0 opacity-50" />
                        : <ChevronRight size={14} className="flex-shrink-0 opacity-50" />}
                      <FolderOpen size={14} className="flex-shrink-0 text-[var(--accent)] opacity-70" />
                      <span className="truncate min-w-0 flex-1 font-medium">{project.name}</span>
                      {hoveredId === `project-${project.id}` && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); onNewConversation(project.id); }}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                            title="新建对话"
                          >
                            <Plus size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                            title="删除项目"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                    {expanded && (
                      <ul className="flex flex-col gap-1 list-none ml-4 pl-3 border-l border-[var(--border)]">
                        {projectConvs.length === 0 ? (
                          <li className="px-2.5 py-2 text-[12px] text-[var(--text-tertiary)]">暂无对话</li>
                        ) : (
                          projectConvs.map((conv) => (
                            <ConversationItem
                              key={conv.id}
                              conv={conv}
                              active={activeId === conv.id}
                              hovered={hoveredId === conv.id}
                              onHover={setHoveredId}
                              onSelect={onSelect}
                              onArchive={onArchive}
                              onDelete={onDelete}
                            />
                          ))
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {standaloneConversations.length === 0 && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--text-tertiary)]">
            <MessageSquare size={20} className="mb-1.5 opacity-40" />
            <p className="text-xs">暂无对话和项目</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pl-3 pr-[30px] py-2 border-t border-[var(--border)]">
        <button onClick={onSettings}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] text-[13px] transition-all duration-150 overflow-hidden">
          <Settings size={14} className="opacity-50" />
          <span>设置</span>
        </button>
      </div>
    </div>
  );
}

function ConversationItem({ conv, active, hovered, onHover, onSelect, onArchive, onDelete }: {
  conv: Conversation;
  active: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li
      onClick={() => onSelect(conv.id)}
      onMouseEnter={() => onHover(conv.id)}
      onMouseLeave={() => onHover(null)}
      className={`flex items-center gap-2.5 p-2.5 rounded-lg text-[13px] cursor-pointer transition-all duration-150 overflow-hidden group ${
        active
          ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
      }`}
    >
      <MessageSquare size={14} className="flex-shrink-0 opacity-50" />
      <span className="truncate min-w-0 flex-1">{conv.title || '新对话'}</span>
      {hovered && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(conv.id); }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            title="归档"
          >
            <Archive size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
            title="删除"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </li>
  );
}
