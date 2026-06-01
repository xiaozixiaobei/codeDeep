export type PermissionLevel = 'important' | 'review' | 'full';

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  permissionLevel?: PermissionLevel;
}
