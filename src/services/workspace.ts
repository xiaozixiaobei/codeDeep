const STORAGE_KEY = 'codedeep_workspace';

export function getWorkspacePath(): string | null {
  return localStorage.getItem(STORAGE_KEY) || null;
}

export function setWorkspacePath(path: string): void {
  localStorage.setItem(STORAGE_KEY, path);
}

export function clearWorkspace(): void {
  localStorage.removeItem(STORAGE_KEY);
}
