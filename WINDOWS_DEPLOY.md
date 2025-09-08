# ChatGLM网页对话应用 - Windows部署指南

## 🪟 Windows系统部署方案

### 方案一：Docker Desktop (推荐)

#### 1. 安装必要软件
- **Docker Desktop**: https://www.docker.com/products/docker-desktop
- **Git for Windows**: https://git-scm.com/download/win (可选)

#### 2. 启动Docker Desktop
确保Docker Desktop正在运行，系统托盘中应该能看到Docker图标。

#### 3. 配置环境变量
```cmd
# 在项目目录中，复制配置文件
copy .env.chatglm.example .env

# 使用记事本编辑配置文件
notepad .env
```

**必须修改的配置**：
```env
CHATGLM_API_KEY=your_chatglm_api_key_here
CHATGLM_ENDPOINT=https://your-cloud-platform.com/api/v1/chat/completions
JWT_SECRET=your-super-secret-jwt-key-change-this
```

#### 4. 运行Windows部署脚本
```cmd
# 双击运行或在命令提示符中执行
deploy-windows.bat
```

#### 5. 访问应用
部署成功后访问: http://localhost:3080

---

### 方案二：WSL2 (高级用户)

#### 1. 启用WSL2
```powershell
# 以管理员身份运行PowerShell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 重启计算机后安装Ubuntu
wsl --install -d Ubuntu
```

#### 2. 在WSL2中部署
```bash
# 进入WSL2终端
wsl

# 进入项目目录
cd /mnt/d/chatGLM/ChatGLM

# 使用Linux部署脚本
chmod +x deploy.sh
./deploy.sh deploy
```

---

### 方案三：手动Docker命令

如果自动脚本有问题，可以手动运行：

#### 1. 构建镜像
```cmd
docker build -t chatglm-app:latest .
```

#### 2. 启动服务
```cmd
docker-compose -f docker-compose.chatglm.yml up -d
```

#### 3. 检查状态
```cmd
docker-compose -f docker-compose.chatglm.yml ps
```

---

## 🔧 Windows常见问题解决

### 问题1: Docker未运行
**解决方法**: 
1. 启动Docker Desktop应用
2. 等待Docker图标变为绿色
3. 重新运行部署脚本

### 问题2: 端口被占用
**解决方法**:
```cmd
# 查看端口占用
netstat -ano | findstr :3080

# 停止占用进程 (以PID为例)
taskkill /F /PID <进程ID>
```

### 问题3: 权限问题
**解决方法**:
1. 以管理员身份运行命令提示符
2. 或者在PowerShell中运行：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 问题4: 防火墙阻止
**解决方法**:
1. Windows防火墙 → 允许应用通过防火墙
2. 添加Docker Desktop和端口3080的规则

---

## 📋 服务管理命令 (Windows)

### 启动服务
```cmd
docker-compose -f docker-compose.chatglm.yml start
```

### 停止服务
```cmd
docker-compose -f docker-compose.chatglm.yml stop
```

### 重启服务
```cmd
docker-compose -f docker-compose.chatglm.yml restart
```

### 查看日志
```cmd
docker-compose -f docker-compose.chatglm.yml logs -f
```

### 完全清理
```cmd
docker-compose -f docker-compose.chatglm.yml down -v
docker rmi chatglm-app:latest
```

---

## 🚀 快速开始

1. **安装Docker Desktop并启动**
2. **复制并编辑.env文件**
3. **双击运行deploy-windows.bat**
4. **访问http://localhost:3080**

就这么简单！Windows部署脚本会自动处理所有步骤。