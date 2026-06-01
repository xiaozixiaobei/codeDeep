import {
  readTextFile, writeTextFile, exists, mkdir,
  readDir, remove, rename,
} from '@tauri-apps/plugin-fs';
import type { DirEntry } from '@tauri-apps/plugin-fs';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export interface FsResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function readFile(path: string): Promise<FsResult<string>> {
  if (!isTauri()) return { success: false, error: '文件操作仅在桌面应用中可用' };
  try {
    const content = await readTextFile(path);
    return { success: true, data: content };
  } catch (err: any) {
    return { success: false, error: err.message || '读取文件失败' };
  }
}

export async function writeFile(path: string, content: string): Promise<FsResult> {
  if (!isTauri()) return { success: false, error: '文件操作仅在桌面应用中可用' };
  try {
    await writeTextFile(path, content);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || '写入文件失败' };
  }
}

export async function checkExists(path: string): Promise<FsResult<boolean>> {
  if (!isTauri()) return { success: false, error: '文件操作仅在桌面应用中可用' };
  try {
    const result = await exists(path);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || '检查路径失败' };
  }
}

export async function createDir(path: string): Promise<FsResult> {
  if (!isTauri()) return { success: false, error: '文件操作仅在桌面应用中可用' };
  try {
    await mkdir(path, { recursive: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || '创建目录失败' };
  }
}

export async function listDir(path: string): Promise<FsResult<DirEntry[]>> {
  if (!isTauri()) return { success: false, error: '文件操作仅在桌面应用中可用' };
  try {
    const entries = await readDir(path);
    return { success: true, data: entries };
  } catch (err: any) {
    return { success: false, error: err.message || '列出目录失败' };
  }
}

export async function removePath(path: string): Promise<FsResult> {
  if (!isTauri()) return { success: false, error: '文件操作仅在桌面应用中可用' };
  try {
    await remove(path, { recursive: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || '删除失败' };
  }
}

export async function renamePath(from: string, to: string): Promise<FsResult> {
  if (!isTauri()) return { success: false, error: '文件操作仅在桌面应用中可用' };
  try {
    await rename(from, to);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || '重命名失败' };
  }
}
