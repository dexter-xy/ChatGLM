# ChatGLM 网页对话应用

基于LibreChat框架定制的ChatGLM专用网页对话应用。

## 🚀 快速开始

### 环境要求
- Docker & Docker Compose
- Node.js 18+ (开发环境)

### 一键部署

1. **配置环境变量**
   ```bash
   cp .env.chatglm.example .env
   # 编辑.env文件，设置ChatGLM API配置
   ```

2. **部署应用**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh deploy
   ```

3. **访问应用**
   - Web界面: http://localhost:3080

## 📋 主要功能

- ✅ **ChatGLM专用集成** - 支持ChatGLM-6B等模型
- ✅ **中文界面** - 完整中文本地化
- ✅ **简化操作** - 专注对话体验
- ✅ **Docker部署** - 一键容器化部署
- ✅ **流式对话** - 实时响应展示

## 📁 项目结构

```
ChatGLM-WebApp/
├── api/                    # 后端服务
│   ├── app/clients/        # API客户端
│   └── server/             # 服务器代码
├── client/                 # 前端应用
│   └── src/                # 源代码
├── librechat.yaml          # 应用配置
├── docker-compose.chatglm.yml # Docker配置
├── deploy.sh               # 部署脚本
└── CHATGLM_DEPLOY.md       # 详细部署文档
```

## 🔧 管理命令

```bash
# 启动服务
./deploy.sh start

# 停止服务  
./deploy.sh stop

# 查看状态
./deploy.sh status

# 查看日志
./deploy.sh logs

# 运行测试
./test.sh
```

## 📖 详细文档

详细部署和配置说明请参考 [CHATGLM_DEPLOY.md](./CHATGLM_DEPLOY.md)

## 📄 许可证

MIT License

---

**开发者**: dexter-xy  
**项目地址**: https://github.com/dexter-xy/ChatGLM-WebApp