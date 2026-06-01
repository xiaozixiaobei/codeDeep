import { useState, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsPage } from './components/Settings';
import { Conversation, Message, Attachment } from './types/chat';
import { Project, PermissionLevel } from './types/project';
import { LLMConfig } from './types/llm';
import { loadConfig, saveConfig, isConfigValid } from './services/config';
import { loadSettings } from './services/settings';
import { loadConversations, saveConversations, loadActiveId, saveActiveId } from './services/conversations';
import { loadProjects, saveProjects } from './services/projects';
import { getWorkspacePath, setWorkspacePath } from './services/workspace';
import { writeFile, readFile, createDir, removePath } from './services/fs';
import { open, confirm } from '@tauri-apps/plugin-dialog';
import { streamChat } from './services/llm';
import { ChatCompletionMessage } from './types/llm';
import { FileOp, validateFilePath } from './services/fileOps';
import { getProjectContext } from './services/projectScanner';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [activeId, setActiveId] = useState<string | null>(loadActiveId);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<LLMConfig>(loadConfig);
  const [view, setView] = useState<'chat' | 'settings'>('chat');
  const [workspace, setWorkspace] = useState<string | null>(getWorkspacePath);
  const abortRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const activeProject = activeConversation?.projectId
    ? projects.find((p) => p.id === activeConversation.projectId)
    : undefined;
  const permissionLevel: PermissionLevel = activeProject
    ? (activeProject.permissionLevel ?? 'important')
    : (activeConversation?.permissionLevel ?? 'important');

  const handleTogglePermission = (level: PermissionLevel) => {
    if (activeProject) {
      setProjects((prev) =>
        prev.map((p) => p.id === activeProject.id ? { ...p, permissionLevel: level } : p)
      );
    } else if (activeConversation) {
      setConversations((prev) =>
        prev.map((c) => c.id === activeConversation.id ? { ...c, permissionLevel: level } : c)
      );
    }
  };

  useEffect(() => { saveConversations(conversations); }, [conversations]);
  useEffect(() => { saveActiveId(activeId); }, [activeId]);
  useEffect(() => { saveProjects(projects); }, [projects]);

  // Apply theme and font size from settings
  useEffect(() => {
    const settings = loadSettings();
    document.documentElement.setAttribute('data-theme', settings.appearance.theme);
    document.documentElement.setAttribute('data-font-size', settings.appearance.fontSize);
  }, [view]); // re-apply when returning from settings

  // When selecting a conversation, auto-set workspace if it belongs to a project
  const handleSelect = (id: string) => {
    setActiveId(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv?.projectId) {
      const project = projects.find((p) => p.id === conv.projectId);
      if (project) {
        setWorkspace(project.path);
        setWorkspacePath(project.path);
      }
    }
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const handleArchiveConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => c.id === id ? { ...c, archived: true } : c)
    );
    if (activeId === id) setActiveId(null);
  };

  const handleUnarchive = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => c.id === id ? { ...c, archived: false } : c)
    );
  };

  const handleDeletePermanent = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSetWorkspace = (path: string) => {
    setWorkspace(path || null);
    setWorkspacePath(path);
  };

  // Project management
  const handleNewProject = async () => {
    const name = prompt('项目名称：');
    if (!name) return;
    const selected = await open({ directory: true, title: '选择项目目录' });
    if (!selected) return;
    const project: Project = {
      id: Date.now().toString(),
      name,
      path: selected as string,
      createdAt: Date.now(),
    };
    setProjects((prev) => [project, ...prev]);
  };

  const handleImportProject = async () => {
    const selected = await open({ directory: true, title: '选择要导入的项目目录' });
    if (!selected) return;
    const path = selected as string;
    const name = path.split('/').pop() || path.split('\\').pop() || path;
    const project: Project = {
      id: Date.now().toString(),
      name,
      path,
      createdAt: Date.now(),
    };
    setProjects((prev) => [project, ...prev]);
  };

  const handleDeleteProject = (id: string) => {
    if (!confirm('确定删除该项目？项目下的所有对话也将被删除。')) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setConversations((prev) => prev.filter((c) => c.projectId !== id));
    if (activeId) {
      const activeConv = conversations.find((c) => c.id === activeId);
      if (activeConv?.projectId === id) setActiveId(null);
    }
  };

  // Conversation creation
  const handleNewConversation = (projectId?: string) => {
    // Check for existing empty conversation in the same scope
    const emptyConv = conversations.find((c) =>
      c.messages.length === 0 && c.projectId === projectId
    );
    if (emptyConv) {
      handleSelect(emptyConv.id);
      return;
    }
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      projectId,
    };
    setConversations((prev) => [newConv, ...prev]);
    handleSelect(newConv.id);

    // Auto-set workspace for project conversations
    if (projectId) {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setWorkspace(project.path);
        setWorkspacePath(project.path);
      }
    }
  };

  const handleApplyFileOp = async (op: FileOp): Promise<void> => {
    if (!workspace) {
      op.error = '请先设置工作区目录';
      return;
    }

    const validation = validateFilePath(op.path, workspace);
    if (!validation.valid) {
      op.error = validation.error;
      return;
    }

    const fullPath = `${workspace}/${op.path}`.replace(/\/+/g, '/');
    try {
      if (op.action === 'create' || op.action === 'write') {
        if (!op.content) { op.error = '文件内容为空'; return; }
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        const dirResult = await createDir(dir);
        if (!dirResult.success) { op.error = `创建目录失败: ${dirResult.error}`; return; }
        const result = await writeFile(fullPath, op.content);
        if (!result.success) op.error = result.error;
      } else if (op.action === 'delete') {
        const existing = await readFile(fullPath);
        if (!existing.success) { op.error = '文件不存在'; return; }
        const confirmed = await confirm(`确定删除文件？\n${op.path}`, { title: '删除确认', kind: 'warning' });
        if (!confirmed) { op.error = '用户取消操作'; return; }
        const delResult = await removePath(fullPath);
        if (!delResult.success) op.error = delResult.error;
      }
    } catch (err: any) {
      op.error = err.message || '操作失败';
    }
  };

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    let convId = activeId;

    if (!convId) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: (content || (attachments?.[0]?.name ?? '图片')).slice(0, 30),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setConversations((prev) => [newConv, ...prev]);
      convId = newConv.id;
      setActiveId(convId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments,
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === convId) {
          const title = conv.messages.length === 0 ? content.slice(0, 30) : conv.title;
          return {
            ...conv,
            title,
            messages: [...conv.messages, userMessage],
            updatedAt: Date.now(),
          };
        }
        return conv;
      })
    );

    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === convId) {
          return {
            ...conv,
            messages: [...conv.messages, assistantMessage],
            updatedAt: Date.now(),
          };
        }
        return conv;
      })
    );

    if (!isConfigValid(config)) {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === convId) {
            return {
              ...conv,
              messages: conv.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, content: '请先在设置中配置 API Key。' }
                  : m
              ),
            };
          }
          return conv;
        })
      );
      setIsLoading(false);
      setView('settings');
      return;
    }

    const conv = conversations.find((c) => c.id === convId) ?? activeConversation;
    const allMessages = conv ? [...conv.messages.filter((m) => m.id !== assistantId), userMessage] : [userMessage];
    const appSettings = loadSettings();
    const basePrompt = appSettings.personalization.systemPrompt || '你是 CodeDeep，一个专业的 AI 编程助手。请用中文回复。';
    let workspaceHint = workspace
      ? `\n\n当前工作区目录: ${workspace}\n当用户要求创建或修改代码文件时，使用以下格式输出文件操作：\n<file path="相对路径" action="write|create|delete">\n文件完整内容\n</file>\npath 使用相对于工作区的路径。action 可选 write（覆盖已有文件）、create（创建新文件）、delete（删除文件）。每个文件操作单独用 <file> 标签包裹。`
      : '';
    if (workspace) {
      try {
        const projectCtx = await getProjectContext(workspace);
        if (projectCtx) workspaceHint += `\n\n${projectCtx}`;
      } catch {}
    }
    const systemPrompt = basePrompt + workspaceHint;
    const apiMessages: ChatCompletionMessage[] = [
      { role: 'system', content: systemPrompt },
      ...allMessages.map((m) => {
        if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
          const parts: ChatCompletionMessage['content'] = [];
          for (const att of m.attachments) {
            parts.push({ type: 'image_url', image_url: { url: att.dataUrl } });
          }
          if (m.content) {
            parts.push({ type: 'text', text: m.content });
          }
          return { role: 'user' as const, content: parts };
        }
        return { role: m.role as 'user' | 'assistant', content: m.content };
      }),
    ];

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      let fullContent = '';

      for await (const chunk of streamChat(config, apiMessages, controller.signal)) {
        fullContent += chunk;

        // Parse thinking content from response
        let thinking = '';
        let content = fullContent;

        const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
          thinking = thinkMatch[1].trim();
          content = fullContent.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        } else if (fullContent.includes('<think>') && !fullContent.includes('</think>')) {
          // Still thinking
          const thinkStart = fullContent.indexOf('<think>');
          thinking = fullContent.slice(thinkStart + 7).trim();
          content = fullContent.slice(0, thinkStart).trim();
        }

        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === convId) {
              return {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === assistantId ? { ...m, content, thinking } : m
                ),
                updatedAt: Date.now(),
              };
            }
            return conv;
          })
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === convId) {
            return {
              ...conv,
              messages: conv.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, content: `请求出错：${err.message}` }
                  : m
              ),
            };
          }
          return conv;
        })
      );
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  if (view === 'settings') {
    return (
      <SettingsPage
        onBack={() => setView('chat')}
        onConfigSave={(newConfig) => {
          setConfig(newConfig);
          saveConfig(newConfig);
        }}
        archivedConversations={conversations.filter((c) => c.archived)}
        onUnarchive={handleUnarchive}
        onDeletePermanent={handleDeletePermanent}
      />
    );
  }

  return (
    <Layout
      sidebar={
        <Sidebar
          conversations={conversations}
          projects={projects}
          activeId={activeId}
          onSelect={handleSelect}
          onNewConversation={handleNewConversation}
          onNewProject={handleNewProject}
          onImportProject={handleImportProject}
          onSettings={() => setView('settings')}
          onDelete={handleDeleteConversation}
          onArchive={handleArchiveConversation}
          onDeleteProject={handleDeleteProject}
        />
      }
      main={
        <ChatArea
          messages={activeConversation?.messages ?? []}
          onSend={handleSend}
          onClear={() => {
            if (activeId) {
              setConversations((prev) =>
                prev.map((c) => c.id === activeId ? { ...c, messages: [], updatedAt: Date.now() } : c)
              );
            }
          }}
          isLoading={isLoading}
          onStop={() => abortRef.current?.abort()}
          onApplyFileOp={handleApplyFileOp}
          workspacePath={workspace}
          onSetWorkspace={handleSetWorkspace}
          permissionLevel={permissionLevel}
          onTogglePermission={handleTogglePermission}
        />
      }
    />
  );
}

export default App;
