# ChatGLM - 智能对话WebUI

<div align="center">

<img src="static/favicon.png" alt="ChatGLM Logo" style="border-radius: 50%; width: 150px; height: 150px;">

**功能丰富、可扩展的自托管 WebUI，设计为完全离线运行**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org/)
[![Docker](https://img.shields.io/badge/Docker-支持-blue.svg)](https://docker.com/)

[功能特性](#功能特性) •
[快速开始](#快速开始) •
[安装部署](#安装部署) •
[使用指南](#使用指南) •
[开发文档](#开发文档) •
[贡献指南](#贡献指南)

</div>

## 🎯 功能特性

### 🤖 多模型支持
- **Ollama 本地模型**: 支持Llama、ChatGLM、Qwen等开源模型
- **OpenAI 兼容API**: 完全兼容OpenAI API格式
- **LiteLLM 集成**: 支持Google Gemini、Anthropic Claude等多平台

### 📚 智能文档处理 (RAG)
- 文档向量化存储与智能检索
- 支持多种格式：PDF、DOCX、TXT、Markdown等
- 上下文增强生成，提升回答准确性

### 🎨 多媒体交互
- **图像生成**: 支持DALL-E、Stable Diffusion等
- **语音交互**: 语音输入识别与TTS语音输出
- **文件处理**: 智能文件上传、解析与处理

### 👥 权限管理
- RBAC角色权限控制系统
- JWT身份认证机制
- 多用户会话管理

### 🌐 国际化支持
- 多语言界面切换
- 完整的i18n国际化体系
- 支持自定义语言包

### ⚡ 现代化架构
- **前端**: SvelteKit + TypeScript + TailwindCSS
- **后端**: FastAPI + Python + Peewee ORM
- **实时通信**: WebSocket支持
- **容器化**: Docker + Kubernetes部署

## 🚀 快速开始

### 使用Docker（推荐）

```bash
# 克隆项目
git clone https://github.com/yourusername/ChatGLM.git
cd ChatGLM

# 启动服务
docker compose up -d
```

访问 `http://localhost:3000` 开始使用。

### 本地开发

**前置要求**
- Node.js 18+
- Python 3.8+
- Git

```bash
# 1. 安装前端依赖
npm install

# 2. 启动前端开发服务器
npm run dev

# 3. 启动后端服务（新终端）
cd backend
pip install -r requirements.txt
./dev.sh
```

## 📦 安装部署

### Docker部署

#### 基础部署
```bash
# 基础版本
docker compose up -d

# GPU加速版本
docker compose -f docker-compose.gpu.yaml up -d

# API模式
docker compose -f docker-compose.api.yaml up -d
```

#### 环境配置
复制 `.env.example` 为 `.env` 并配置必要参数：

```bash
cp .env.example .env
# 编辑 .env 文件配置数据库、API密钥等
```

### Kubernetes部署

```bash
# CPU版本
kubectl apply -f ./kubernetes/manifest/base

# GPU版本
kubectl apply -k ./kubernetes/manifest

# 使用Helm
helm package ./kubernetes/helm/
helm install chatglm ./chatglm-*.tgz
```

### 本地源码部署

详细安装步骤请参考 [INSTALLATION.md](INSTALLATION.md)

## 🎮 使用指南

### 基本对话
1. 打开 `http://localhost:3000`
2. 注册/登录账户
3. 选择或配置AI模型
4. 开始智能对话

### 文档问答（RAG）
1. 进入"文档管理"页面
2. 上传PDF、Word或文本文档
3. 等待文档处理完成
4. 在对话中引用文档内容

### 图像生成
1. 在对话中输入图像描述
2. 选择图像生成模型
3. 调整生成参数
4. 获取生成结果

### 语音交互
1. 点击麦克风图标
2. 语音输入问题
3. 系统自动转换为文字
4. 支持语音播放回答

## 🛠 开发文档

### 项目结构

```
ChatGLM/
├── src/                    # 前端源码
│   ├── lib/
│   │   ├── apis/          # API客户端
│   │   ├── components/    # Svelte组件
│   │   ├── stores/        # 状态管理
│   │   └── utils/         # 工具函数
│   └── routes/            # 路由页面
├── backend/               # 后端源码
│   ├── apps/              # 功能模块
│   │   ├── ollama/        # Ollama集成
│   │   ├── openai/        # OpenAI兼容
│   │   ├── rag/           # RAG系统
│   │   └── web/           # Web核心
│   ├── config.py          # 配置管理
│   └── main.py            # 应用入口
├── static/                # 静态资源
├── docker-compose.yaml    # Docker配置
└── package.json           # 项目配置
```

### 开发命令

```bash
# 前端开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run lint             # 代码检查
npm run format           # 代码格式化

# 后端开发
cd backend && ./dev.sh   # 启动后端服务
npm run lint:backend     # 后端代码检查
npm run format:backend   # 后端代码格式化

# 测试
npm run test:frontend    # 前端单元测试
npm run cy:open          # E2E测试
```

### API文档

启动项目后访问：
- 后端API文档: `http://localhost:8080/docs`
- 前端Storybook: `http://localhost:6006`

### 技术栈

**前端技术**
- SvelteKit - 全栈Web框架
- TypeScript - 类型安全
- TailwindCSS - 原子化CSS
- Vite - 构建工具
- Vitest - 单元测试

**后端技术**
- FastAPI - 高性能API框架
- Peewee - 轻量级ORM
- ChromaDB - 向量数据库
- LiteLLM - 多模型集成
- APScheduler - 任务调度

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 提交Issue
- 使用Issue模板
- 提供详细的重现步骤
- 附上相关截图或日志

### 提交PR
1. Fork项目到你的GitHub
2. 创建功能分支：`git checkout -b feature/AmazingFeature`
3. 提交修改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 创建Pull Request

### 开发规范
- 遵循现有代码风格
- 添加必要的测试用例
- 更新相关文档
- 确保通过所有检查：`npm run lint`

### 国际化贡献
我们需要更多语言支持！
```bash
# 解析新的翻译文本
npm run i18n:parse

# 翻译文件位置
src/lib/i18n/locales/
```

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 🙏 致谢

感谢以下开源项目的支持：
- [Ollama](https://ollama.ai/) - 本地模型运行
- [LiteLLM](https://github.com/BerriAI/litellm) - 多模型集成
- [SvelteKit](https://kit.svelte.dev/) - 前端框架
- [FastAPI](https://fastapi.tiangolo.com/) - 后端框架

## 📞 联系我们

- 📧 邮箱: 1436143769@qq.com

---

<div align="center">

**如果这个项目对你有帮助，请给我们一个 ⭐ Star！**

Made with ❤️ by ChatGLM Team

</div>
