import { Code, Bug, Wrench, TestTube, BookOpen, Zap, MessageSquare, Trash2, FileSearch, GitBranch, Lightbulb, PenLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SlashCommand {
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'skill' | 'action';
  prompt?: string;
  action?: 'clear';
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // AI 技能
  {
    name: 'explain',
    description: '解释选中的代码或文件',
    icon: BookOpen,
    category: 'skill',
    prompt: '请解释这段代码的作用，包括它的逻辑、输入输出和关键设计决策：\n\n',
  },
  {
    name: 'fix',
    description: '分析并修复 Bug',
    icon: Bug,
    category: 'skill',
    prompt: '请分析以下代码中的 bug，并提供修复方案：\n\n',
  },
  {
    name: 'refactor',
    description: '重构代码，提升可读性和可维护性',
    icon: Wrench,
    category: 'skill',
    prompt: '请重构以下代码，提升可读性、可维护性和性能，保持功能不变：\n\n',
  },
  {
    name: 'test',
    description: '为代码编写单元测试',
    icon: TestTube,
    category: 'skill',
    prompt: '请为以下代码编写完整的单元测试，覆盖正常路径和边界情况：\n\n',
  },
  {
    name: 'review',
    description: '代码审查，给出改进建议',
    icon: FileSearch,
    category: 'skill',
    prompt: '请对以下代码进行审查，指出潜在问题并给出改进建议：\n\n',
  },
  {
    name: 'optimize',
    description: '优化性能瓶颈',
    icon: Zap,
    category: 'skill',
    prompt: '请分析以下代码的性能瓶颈，并提供优化方案：\n\n',
  },
  {
    name: 'docs',
    description: '生成代码文档和注释',
    icon: PenLine,
    category: 'skill',
    prompt: '请为以下代码生成清晰的文档注释，包括函数说明、参数、返回值和使用示例：\n\n',
  },
  {
    name: 'complete',
    description: '补全未完成的代码',
    icon: Code,
    category: 'skill',
    prompt: '请补全以下代码，实现完整的功能：\n\n',
  },
  {
    name: 'git',
    description: '生成 Git commit message',
    icon: GitBranch,
    category: 'skill',
    prompt: '请根据以下代码变更生成一个简洁的 Git commit message：\n\n',
  },
  {
    name: 'idea',
    description: '提出实现方案或架构建议',
    icon: Lightbulb,
    category: 'skill',
    prompt: '请针对以下需求，提出实现方案和架构建议：\n\n',
  },

  // 快捷操作
  {
    name: 'clear',
    description: '清空当前对话历史',
    icon: Trash2,
    category: 'action',
    action: 'clear',
  },
  {
    name: 'chat',
    description: '自由对话模式',
    icon: MessageSquare,
    category: 'skill',
    prompt: '',
  },
];

export function filterCommands(query: string): SlashCommand[] {
  if (!query) return SLASH_COMMANDS;
  const lower = query.toLowerCase();
  return SLASH_COMMANDS.filter(
    (cmd) => cmd.name.includes(lower) || cmd.description.includes(lower)
  );
}
