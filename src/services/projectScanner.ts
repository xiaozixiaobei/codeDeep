import { readDir, readTextFile } from '@tauri-apps/plugin-fs';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.venv', 'venv', 'target', '.cache', '.idea', '.vscode',
]);

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

export async function buildFileTree(dirPath: string, depth = 0): Promise<FileNode[]> {
  if (depth > 4) return [];
  try {
    const entries = await readDir(dirPath);
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const fullPath = `${dirPath}/${entry.name}`;
      const isDir = entry.isDirectory;

      if (isDir) {
        const children = await buildFileTree(fullPath, depth + 1);
        nodes.push({ name: entry.name, path: fullPath, isDir: true, children });
      } else {
        nodes.push({ name: entry.name, path: fullPath, isDir: false });
      }
    }

    return nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch {
    return [];
  }
}

function renderTree(nodes: FileNode[], prefix = ''): string {
  const lines: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    if (node.isDir) {
      lines.push(`${prefix}${connector}${node.name}/`);
      if (node.children) {
        lines.push(renderTree(node.children, prefix + childPrefix));
      }
    } else {
      lines.push(`${prefix}${connector}${node.name}`);
    }
  }
  return lines.join('\n');
}

export async function getProjectContext(dirPath: string): Promise<string> {
  const tree = await buildFileTree(dirPath);
  if (tree.length === 0) return '';

  const treeStr = renderTree(tree);
  let context = `项目文件结构:\n\`\`\`\n${dirPath}\n${treeStr}\n\`\`\`\n`;

  // Read key config files
  const keyFiles = ['package.json', 'tsconfig.json', 'Cargo.toml', 'pyproject.toml',
    'go.mod', 'Makefile', 'Dockerfile', '.env.example', 'README.md'];

  const rootEntries = tree.map((n) => n.name);
  for (const kf of keyFiles) {
    if (rootEntries.includes(kf)) {
      try {
        const content = await readTextFile(`${dirPath}/${kf}`);
        if (content.length < 3000) {
          context += `\n${kf}:\n\`\`\`\n${content}\n\`\`\`\n`;
        }
      } catch {}
    }
  }

  return context;
}

export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    return await readTextFile(filePath);
  } catch {
    return null;
  }
}
