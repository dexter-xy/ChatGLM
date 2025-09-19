---
applyTo: '**'
---

# Open WebUI - GitHub Copilot Instructions

## 项目概述

Open WebUI 是一个功能丰富、可扩展的自托管 WebUI，设计为完全离线运行。它支持各种 LLM 运行器，包括 Ollama 和 OpenAI 兼容的 API。

## 技术栈

### 前端
- **框架**: SvelteKit + TypeScript
- **样式**: TailwindCSS
- **构建工具**: Vite
- **测试**: Vitest, Cypress
- **状态管理**: Svelte stores
- **国际化**: i18next

### 后端
- **框架**: FastAPI + Python
- **数据库**: SQLite
- **服务器**: uvicorn
- **Python 浏览器支持**: Pyodide

## 编码规范和最佳实践

### 通用规范
- 使用 TypeScript 进行类型安全开发
- 遵循项目现有的代码风格和命名约定
- 所有新功能都需要适当的错误处理
- 确保代码的可访问性和国际化支持
- 优先考虑性能和用户体验

### 前端开发规范

#### Svelte/SvelteKit
- 使用 Composition API 风格的 Svelte 组件
- 组件文件使用 PascalCase 命名 (例如: `ChatMessage.svelte`)
- 使用 TypeScript 定义组件的 props 和事件
- 利用 SvelteKit 的文件路由系统
- 使用 `$lib` 别名导入库文件

#### 样式规范
- 优先使用 TailwindCSS 类名
- 避免内联样式，使用 Tailwind 实用类
- 保持响应式设计原则
- 使用语义化的 HTML 标签

#### 状态管理
- 使用 Svelte stores 进行全局状态管理
- 将相关状态逻辑组织到单独的 store 文件中
- 使用 writable、readable、derived stores 合适的类型

#### API 调用
- 将 API 调用逻辑集中到 `src/lib/apis/` 目录
- 使用适当的错误处理和加载状态
- 实现请求取消和重试机制

### 后端开发规范

#### FastAPI
- 使用 FastAPI 的依赖注入系统
- 定义清晰的 Pydantic 模型用于请求/响应
- 使用适当的 HTTP 状态码
- 实现详细的 API 文档

#### 数据库
- 使用 SQLAlchemy ORM 进行数据库操作
- 定义清晰的数据模型和关系
- 实现适当的数据验证和约束

#### 安全性
- 验证所有用户输入
- 实现适当的身份验证和授权
- 不在代码中硬编码敏感信息
- 使用环境变量进行配置

### 文件组织

#### 前端文件结构
```
src/
├── lib/
│   ├── apis/          # API 客户端
│   ├── components/    # 可复用组件
│   ├── stores/        # 状态管理
│   ├── utils/         # 工具函数
│   └── i18n/          # 国际化文件
├── routes/            # SvelteKit 路由
└── app.html           # HTML 模板
```

#### 后端文件结构
```
backend/
├── apps/              # 功能模块
│   ├── ollama/       # Ollama 集成
│   ├── openai/       # OpenAI API
│   ├── rag/          # RAG 功能
│   └── ...
├── utils/            # 工具函数
├── main.py           # FastAPI 应用
└── config.py         # 配置管理
```

### 测试指南
- 为新功能编写单元测试和集成测试
- 使用 Vitest 进行前端测试
- 使用 Cypress 进行 E2E 测试
- 测试文件应与源文件位置对应

### 国际化 (i18n)
- 所有用户可见的文本都必须支持国际化
- 使用 i18next 进行文本翻译
- 新增文本后运行 `npm run i18n:parse` 更新翻译文件

### 性能优化
- 使用 Svelte 的响应式特性避免不必要的重渲染
- 实现适当的懒加载和代码分割
- 优化图片和资源加载
- 使用 Web Workers 处理重计算任务

### Git 工作流
- 使用有意义的提交信息
- 保持小而专注的提交
- 使用功能分支进行开发
- 在合并前确保代码通过所有测试

### 文档要求
- 为复杂功能提供清晰的代码注释
- 更新相关的 README 和文档
- 为新 API 端点提供适当的文档

## 常见模式和约定

### 组件模式
- 使用组合而非继承
- 保持组件的单一职责
- 通过 props 和事件进行组件通信
- 使用 slots 进行内容分发

### 错误处理
- 实现全局错误处理机制
- 提供用户友好的错误信息
- 记录详细的错误信息用于调试
- 实现适当的回退机制

### 数据流
- 单向数据流原则
- 使用 stores 管理共享状态
- 避免深层组件间的直接通信

当生成代码、回答问题或审查变更时，请遵循这些指导原则，确保代码质量、一致性和项目的整体架构完整性。