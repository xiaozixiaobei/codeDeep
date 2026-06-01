# CodeDeep

AI 编程助手桌面应用，支持 DeepSeek 及 OpenAI 兼容 API。

## 功能

- **流式对话** — 实时流式输出 AI 回复，支持 Markdown 渲染和代码高亮
- **多模态** — 支持粘贴、拖拽、上传图片，DeepSeek 视觉识别
- **文件操作** — AI 生成的 `<file>` 标签自动创建/修改/删除文件，支持 Diff 预览和批量应用
- **命令执行** — AI 生成的 Shell 代码块可一键运行，支持危险命令拦截确认
- **思考过程** — 解析 AI 返回的 `<think>` 标签，默认折叠，可展开查看
- **斜杠命令** — 输入 `/` 触发快捷命令（/explain、/fix、/refactor 等 12 个）
- **权限控制** — 每个对话/项目可设置权限级别：默认、自动审核、完全访问
- **项目管理** — 创建/导入项目，关联对话，自动设置工作区目录
- **暗色主题** — 支持亮色/暗色主题切换
- **字体大小** — 可调节字体大小（小/中/大）
- **对话管理** — 搜索、归档、删除对话

## 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS v4 + Vite
- **桌面框架**: Tauri 2 (Rust)
- **AI 协议**: OpenAI 兼容 API (SSE 流式传输)
- **插件**: tauri-plugin-shell, tauri-plugin-fs, tauri-plugin-dialog, tauri-plugin-store

## 开发环境

### 前置要求

- Node.js 20+
- Rust 1.77+ (macOS 需 Homebrew 安装)
- macOS / Windows / Linux

### 安装依赖

```bash
npm install
```

### 运行开发环境

```bash
npm run tauri dev
```

### 构建应用

```bash
npm run tauri build
```

macOS 会生成 `.app` 和 `.dmg` 安装包。

## 项目结构

```
codeDeep/
├── src/                        # 前端代码
│   ├── components/            # UI 组件 (ChatArea, ChatInput, ChatMessage, FileOpCard 等)
│   ├── services/              # 服务层 (llm, shell, fs, fileOps, config 等)
│   ├── types/                 # TypeScript 类型定义
│   └── styles.css             # 全局样式和主题变量
├── src-tauri/                 # Tauri 后端
│   ├── src/lib.rs            # Rust 入口 (命令执行等)
│   ├── capabilities/         # 权限配置
│   └── Cargo.toml
└── package.json
```

## 配置

首次使用需在设置中配置 API：

1. **Base URL** — API 地址（如 `https://api.deepseek.com`）
2. **API Key** — 你的密钥
3. **Model** — 模型名称（如 `deepseek-chat`）

支持任何 OpenAI 兼容的 API 提供商。
