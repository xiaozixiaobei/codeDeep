# CodeDeep

AI 编程助手 - 对标 Codex App，支持 DeepSeek API 及三方 API

## 技术栈

- **前端**: React + TypeScript + Vite
- **桌面框架**: Tauri 2
- **后端**: Rust
- **沙箱**: Docker
- **存储**: SQLite

## 开发环境

### 前置要求

- Node.js 18+
- Rust 1.70+
- Docker (用于沙箱执行)

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

## 项目结构

```
codeDeep/
├── src/                    # 前端代码
│   ├── components/        # UI 组件
│   ├── services/          # API 服务
│   ├── hooks/             # React Hooks
│   ├── types/             # TypeScript 类型
│   └── utils/             # 工具函数
├── src-tauri/             # Tauri 后端 (Rust)
│   ├── src/
│   └── Cargo.toml
└── package.json
```

## 核心功能

- [ ] 聊天对话界面
- [ ] 代码编辑器 (Monaco)
- [ ] 终端面板 (xterm.js)
- [ ] DeepSeek API 接入
- [ ] 通用 OpenAI 兼容 API
- [ ] Docker 沙箱执行
- [ ] 文件系统操作
- [ ] Git 集成
