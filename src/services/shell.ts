import { invoke } from '@tauri-apps/api/core';

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function executeCommand(cmd: string, cwd?: string): Promise<CommandResult> {
  if (!isTauri()) {
    return {
      code: 1,
      stdout: '',
      stderr: '命令执行仅在桌面应用中可用',
    };
  }

  try {
    const result = await invoke<CommandResult>('execute_command', { cmd, cwd });
    return result;
  } catch (err: any) {
    return {
      code: 1,
      stdout: '',
      stderr: err.message || '命令执行失败',
    };
  }
}
