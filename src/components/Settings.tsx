import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Loader2, RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight,
  Settings as SettingsIcon, Palette, Server, User,
  Puzzle, GitBranch, FolderTree, Archive, Zap, Globe,
} from 'lucide-react';
import { LLMConfig, PROVIDERS } from '../types/llm';
import { loadConfig, saveConfig } from '../services/config';
import { fetchModels } from '../services/llm';
import { AppSettings, EnvVar } from '../types/settings';
import { loadSettings, saveSettings } from '../services/settings';
import { Conversation } from '../types/chat';

interface SettingsPageProps {
  onBack: () => void;
  onConfigSave: (config: LLMConfig) => void;
  archivedConversations: Conversation[];
  onUnarchive: (id: string) => void;
  onDeletePermanent: (id: string) => void;
}

type TabKey = 'general' | 'appearance' | 'config' | 'personalization' | 'mcp' | 'hooks' | 'git' | 'env' | 'worktree' | 'archived';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { key: 'general', label: '常规', icon: SettingsIcon },
  { key: 'appearance', label: '外观', icon: Palette },
  { key: 'config', label: '配置', icon: Zap },
  { key: 'personalization', label: '个性化', icon: User },
  { key: 'mcp', label: 'MCP 服务器', icon: Server },
  { key: 'hooks', label: '钩子', icon: Puzzle },
  { key: 'git', label: 'Git', icon: GitBranch },
  { key: 'env', label: '环境', icon: Globe },
  { key: 'worktree', label: '工作树', icon: FolderTree },
  { key: 'archived', label: '已归档对话', icon: Archive },
];

const inputCls = 'w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent)] transition-colors';
const selectCls = 'w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors';
const labelCls = 'block text-sm font-medium text-[var(--text-primary)] mb-1.5';

export function SettingsPage({ onBack, onConfigSave, archivedConversations, onUnarchive, onDeletePermanent }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [config, setConfig] = useState<LLMConfig>(loadConfig);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadModels = useCallback(async (c: LLMConfig) => {
    if (!c.apiKey || !c.baseUrl) { setModels([]); return; }
    setLoadingModels(true);
    try {
      const list = await fetchModels(c);
      setModels(list);
      if (list.length > 0 && !list.includes(c.model)) {
        setConfig((prev) => ({ ...prev, model: list[0] }));
      }
    } catch { setModels([]); }
    finally { setLoadingModels(false); }
  }, []);

  useEffect(() => { loadModels(config); }, []);

  const scheduleLoadModels = useCallback((c: LLMConfig) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadModels(c), 600);
  }, [loadModels]);

  const handleConfigSave = () => {
    saveConfig(config);
    onConfigSave(config);
  };

  const handleProviderChange = (provider: string) => {
    const preset = PROVIDERS[provider];
    if (preset) { const next = { ...config, ...preset }; setConfig(next); loadModels(next); }
  };

  const updateSettings = (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <Section title="常规" desc="语言和启动行为等通用设置">
            <Field label="语言">
              <select value={settings.general.language}
                onChange={(e) => updateSettings({ general: { ...settings.general, language: e.target.value as any } })}
                className={selectCls}>
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </Field>
            <Field label="启动时">
              <select value={settings.general.startupAction}
                onChange={(e) => updateSettings({ general: { ...settings.general, startupAction: e.target.value as any } })}
                className={selectCls}>
                <option value="home">显示主页</option>
                <option value="lastConversation">恢复上次对话</option>
              </select>
            </Field>
          </Section>
        );

      case 'appearance':
        return (
          <Section title="外观" desc="主题和字体大小等外观设置">
            <Field label="主题">
              <div className="flex gap-3">
                {(['light', 'dark'] as const).map((t) => (
                  <button key={t} onClick={() => updateSettings({ appearance: { ...settings.appearance, theme: t } })}
                    className={`flex-1 h-20 rounded-lg border-2 transition-colors flex items-center justify-center text-sm ${
                      settings.appearance.theme === t
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]'
                        : 'border-[var(--border)] hover:border-[var(--border-light)] text-[var(--text-secondary)]'
                    }`}>
                    {t === 'light' ? '浅色' : '深色'}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="字体大小">
              <div className="flex gap-3">
                {([
                  { key: 'small' as const, label: '小', size: '13px' },
                  { key: 'medium' as const, label: '中', size: '14px' },
                  { key: 'large' as const, label: '大', size: '16px' },
                ]).map((opt) => (
                  <button key={opt.key}
                    onClick={() => updateSettings({ appearance: { ...settings.appearance, fontSize: opt.key } })}
                    className={`flex-1 h-12 rounded-lg border-2 transition-colors text-sm ${
                      settings.appearance.fontSize === opt.key
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]'
                        : 'border-[var(--border)] hover:border-[var(--border-light)] text-[var(--text-secondary)]'
                    }`}>
                    <span style={{ fontSize: opt.size }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </Field>
          </Section>
        );

      case 'config':
        return (
          <Section title="配置" desc="管理 LLM 服务商和 API 连接设置">
            <Field label="服务商">
              <select value={config.provider} onChange={(e) => handleProviderChange(e.target.value)} className={selectCls}>
                <option value="deepseek">DeepSeek</option>
                <option value="openai">OpenAI</option>
                <option value="custom">自定义</option>
              </select>
            </Field>
            <Field label="API Key">
              <input type="password" value={config.apiKey}
                onChange={(e) => { const n = { ...config, apiKey: e.target.value }; setConfig(n); scheduleLoadModels(n); }}
                placeholder="sk-..." className={inputCls} />
            </Field>
            <Field label="Base URL">
              <input type="text" value={config.baseUrl}
                onChange={(e) => { const n = { ...config, baseUrl: e.target.value }; setConfig(n); scheduleLoadModels(n); }}
                placeholder="https://api.deepseek.com" className={inputCls} />
            </Field>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">模型</label>
                <button onClick={() => loadModels(config)} disabled={loadingModels}
                  className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors disabled:opacity-50">
                  <RefreshCw size={12} className={loadingModels ? 'animate-spin' : ''} /><span>刷新</span>
                </button>
              </div>
              {loadingModels ? (
                <div className={`${inputCls} flex items-center gap-2`}>
                  <Loader2 size={14} className="animate-spin" /><span className="text-[var(--text-tertiary)]">加载模型列表...</span>
                </div>
              ) : models.length > 0 ? (
                <select value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} className={selectCls}>
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input type="text" value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="输入模型名称" className={inputCls} />
              )}
            </div>
            <Field label={`Temperature: ${config.temperature ?? 0.7}`}>
              <input type="range" min="0" max="2" step="0.1" value={config.temperature ?? 0.7}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })} className="w-full" />
            </Field>
            <button onClick={handleConfigSave}
              className="px-5 h-9 rounded-lg text-sm text-white bg-[var(--accent)] hover:bg-[var(--accent-dark)] transition-colors">
              保存
            </button>
          </Section>
        );

      case 'personalization':
        return (
          <Section title="个性化" desc="自定义 AI 助手的行为和回复风格">
            <Field label="System Prompt">
              <textarea value={settings.personalization.systemPrompt}
                onChange={(e) => updateSettings({ personalization: { ...settings.personalization, systemPrompt: e.target.value } })}
                rows={6} placeholder="设定 AI 助手的角色和行为..."
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent)] transition-colors resize-none leading-relaxed" />
            </Field>
          </Section>
        );

      case 'env':
        return (
          <Section title="环境" desc="配置运行时环境变量">
            <div className="space-y-2">
              {settings.environment.vars.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)] py-4">暂无环境变量，点击下方添加</p>
              ) : (
                settings.environment.vars.map((v) => (
                  <div key={v.id} className="flex items-center gap-2">
                    <button onClick={() => {
                      const vars = settings.environment.vars.map((x) => x.id === v.id ? { ...x, enabled: !x.enabled } : x);
                      updateSettings({ environment: { ...settings.environment, vars } });
                    }} className="flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors">
                      {v.enabled ? <ToggleRight size={20} className="text-[var(--accent)]" /> : <ToggleLeft size={20} />}
                    </button>
                    <input value={v.key} placeholder="KEY"
                      onChange={(e) => {
                        const vars = settings.environment.vars.map((x) => x.id === v.id ? { ...x, key: e.target.value } : x);
                        updateSettings({ environment: { ...settings.environment, vars } });
                      }}
                      className="w-1/3 h-9 px-2.5 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent)] transition-colors" />
                    <input value={v.value} placeholder="value"
                      onChange={(e) => {
                        const vars = settings.environment.vars.map((x) => x.id === v.id ? { ...x, value: e.target.value } : x);
                        updateSettings({ environment: { ...settings.environment, vars } });
                      }}
                      className="flex-1 h-9 px-2.5 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent)] transition-colors" />
                    <button onClick={() => {
                      const vars = settings.environment.vars.filter((x) => x.id !== v.id);
                      updateSettings({ environment: { ...settings.environment, vars } });
                    }} className="flex-shrink-0 text-[var(--text-tertiary)] hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => {
              const newVar: EnvVar = { id: Date.now().toString(), key: '', value: '', enabled: true };
              updateSettings({ environment: { ...settings.environment, vars: [...settings.environment.vars, newVar] } });
            }} className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
              <Plus size={14} /><span>添加变量</span>
            </button>
          </Section>
        );

      case 'mcp':
        return <Placeholder title="MCP 服务器" desc="管理和配置 MCP 服务器连接" />;
      case 'hooks':
        return <Placeholder title="钩子" desc="配置生命周期钩子和自动化脚本" />;
      case 'git':
        return <Placeholder title="Git" desc="Git 相关配置和集成设置" />;
      case 'worktree':
        return <Placeholder title="工作树" desc="Git 工作树管理" />;
      case 'archived':
        return (
          <Section title="已归档对话" desc="查看和管理已归档的对话记录">
            {archivedConversations.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] py-4">暂无已归档的对话</p>
            ) : (
              <div className="space-y-2">
                {archivedConversations.map((conv) => (
                  <div key={conv.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">{conv.title || '新对话'}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{conv.messages.length} 条消息</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <button onClick={() => onUnarchive(conv.id)}
                        className="px-2.5 h-7 rounded text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                        恢复
                      </button>
                      <button onClick={() => onDeletePermanent(conv.id)}
                        className="px-2.5 h-7 rounded text-xs text-red-500 hover:bg-red-50 transition-colors">
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        );
    }
  };

  return (
    <div className="flex h-full">
      {/* Left nav */}
      <div className="w-[240px] flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col">
        <div className="px-4 pt-3 pb-2 border-b border-[var(--border)]">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={16} /><span>返回</span>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors mb-0.5 ${
                  active
                    ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}>
                <Icon size={15} className={active ? 'text-[var(--accent)]' : 'opacity-60'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right content */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        {renderContent()}
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{title}</h2>
      <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
      <div className="mt-6 text-sm text-[var(--text-tertiary)]">暂未开放，敬请期待</div>
    </div>
  );
}
