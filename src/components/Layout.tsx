import { ReactNode, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface LayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
}

export function Layout({ sidebar, main }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full gap-[14px]">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[52px]' : 'w-[260px]'} bg-[var(--bg-secondary)] flex flex-col border-r border-[var(--border)] transition-all duration-200`}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
          {!collapsed && (
            <span className="text-sm font-medium text-[var(--text-primary)] pl-1">CodeDeep</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors ml-auto"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1 py-2">
              <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors">
                <span className="text-lg">+</span>
              </button>
            </div>
          ) : (
            sidebar
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {main}
      </main>
    </div>
  );
}
