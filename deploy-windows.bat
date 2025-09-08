@echo off
setlocal EnableDelayedExpansion

REM ====================================================================
REM ChatGLM网页对话应用 - Windows部署脚本
REM 基于LibreChat框架的ChatGLM专用部署工具 (Windows版本)
REM ====================================================================

echo [INFO] 开始部署ChatGLM网页对话应用 (Windows版本)...

REM 检查Docker Desktop是否运行
echo [INFO] 检查Docker环境...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker未运行，请先启动Docker Desktop
    echo [INFO] 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

docker-compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose未安装或未运行
    pause
    exit /b 1
)

echo [SUCCESS] Docker环境检查通过

REM 检查环境变量文件
echo [INFO] 检查环境变量配置...
if not exist ".env" (
    if exist ".env.chatglm.example" (
        echo [WARNING] .env文件不存在，从示例文件复制...
        copy .env.chatglm.example .env
        echo [WARNING] 请编辑 .env 文件并设置正确的ChatGLM API配置
        echo [INFO] 按任意键继续编辑.env文件...
        pause
        notepad .env
    ) else (
        echo [ERROR] .env文件和示例文件都不存在
        pause
        exit /b 1
    )
)

REM 创建必要的目录
echo [INFO] 创建必要的目录结构...
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\logs" mkdir data\logs
if not exist "data\logs\nginx" mkdir data\logs\nginx
if not exist "data\mongo-init" mkdir data\mongo-init
if not exist "nginx" mkdir nginx

echo [SUCCESS] 目录结构创建完成

REM 生成Nginx配置
echo [INFO] 生成Nginx配置文件...
echo events { > nginx\nginx.conf
echo     worker_connections 1024; >> nginx\nginx.conf
echo } >> nginx\nginx.conf
echo. >> nginx\nginx.conf
echo http { >> nginx\nginx.conf
echo     upstream chatglm_backend { >> nginx\nginx.conf
echo         server chatglm-api:3080; >> nginx\nginx.conf
echo     } >> nginx\nginx.conf
echo. >> nginx\nginx.conf
echo     server { >> nginx\nginx.conf
echo         listen 80; >> nginx\nginx.conf
echo         server_name localhost; >> nginx\nginx.conf
echo. >> nginx\nginx.conf
echo         client_max_body_size 50M; >> nginx\nginx.conf
echo. >> nginx\nginx.conf
echo         location / { >> nginx\nginx.conf
echo             proxy_pass http://chatglm_backend; >> nginx\nginx.conf
echo             proxy_http_version 1.1; >> nginx\nginx.conf
echo             proxy_set_header Upgrade $http_upgrade; >> nginx\nginx.conf
echo             proxy_set_header Connection 'upgrade'; >> nginx\nginx.conf
echo             proxy_set_header Host $host; >> nginx\nginx.conf
echo             proxy_set_header X-Real-IP $remote_addr; >> nginx\nginx.conf
echo             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; >> nginx\nginx.conf
echo             proxy_set_header X-Forwarded-Proto $scheme; >> nginx\nginx.conf
echo             proxy_cache_bypass $http_upgrade; >> nginx\nginx.conf
echo             proxy_read_timeout 300; >> nginx\nginx.conf
echo             proxy_connect_timeout 300; >> nginx\nginx.conf
echo             proxy_send_timeout 300; >> nginx\nginx.conf
echo         } >> nginx\nginx.conf
echo. >> nginx\nginx.conf
echo         location /health { >> nginx\nginx.conf
echo             proxy_pass http://chatglm_backend/health; >> nginx\nginx.conf
echo             access_log off; >> nginx\nginx.conf
echo         } >> nginx\nginx.conf
echo     } >> nginx\nginx.conf
echo } >> nginx\nginx.conf

echo [SUCCESS] Nginx配置文件生成完成

REM 生成MongoDB初始化脚本
echo [INFO] 生成MongoDB初始化脚本...
echo // ChatGLM数据库初始化脚本 > data\mongo-init\init-chatglm.js
echo. >> data\mongo-init\init-chatglm.js
echo db = db.getSiblingDB('ChatGLM'); >> data\mongo-init\init-chatglm.js
echo. >> data\mongo-init\init-chatglm.js
echo db.users.createIndex({ "email": 1 }, { unique: true }); >> data\mongo-init\init-chatglm.js
echo db.users.createIndex({ "username": 1 }); >> data\mongo-init\init-chatglm.js
echo db.conversations.createIndex({ "userId": 1 }); >> data\mongo-init\init-chatglm.js
echo db.conversations.createIndex({ "createdAt": -1 }); >> data\mongo-init\init-chatglm.js
echo db.messages.createIndex({ "conversationId": 1 }); >> data\mongo-init\init-chatglm.js
echo db.messages.createIndex({ "userId": 1 }); >> data\mongo-init\init-chatglm.js
echo db.messages.createIndex({ "createdAt": -1 }); >> data\mongo-init\init-chatglm.js
echo. >> data\mongo-init\init-chatglm.js
echo db.configs.insertOne({ >> data\mongo-init\init-chatglm.js
echo   _id: "chatglm_default", >> data\mongo-init\init-chatglm.js
echo   name: "ChatGLM默认配置", >> data\mongo-init\init-chatglm.js
echo   model: "chatglm-6b", >> data\mongo-init\init-chatglm.js
echo   temperature: 0.7, >> data\mongo-init\init-chatglm.js
echo   max_tokens: 2048, >> data\mongo-init\init-chatglm.js
echo   created_at: new Date() >> data\mongo-init\init-chatglm.js
echo }); >> data\mongo-init\init-chatglm.js
echo. >> data\mongo-init\init-chatglm.js
echo print("ChatGLM数据库初始化完成"); >> data\mongo-init\init-chatglm.js

echo [SUCCESS] MongoDB初始化脚本生成完成

REM 构建Docker镜像
echo [INFO] 开始构建ChatGLM Docker镜像...
docker build -t chatglm-app:latest . --no-cache
if %errorlevel% neq 0 (
    echo [ERROR] Docker镜像构建失败
    pause
    exit /b 1
)
echo [SUCCESS] Docker镜像构建成功

REM 启动服务
echo [INFO] 启动ChatGLM服务...
docker-compose -f docker-compose.chatglm.yml up -d
if %errorlevel% neq 0 (
    echo [ERROR] 服务启动失败
    pause
    exit /b 1
)
echo [SUCCESS] 服务启动成功

REM 等待服务就绪
echo [INFO] 等待服务就绪...
set /a attempts=0
:wait_loop
set /a attempts+=1
if !attempts! gtr 30 (
    echo [ERROR] 服务启动超时
    docker-compose -f docker-compose.chatglm.yml logs --tail=50
    pause
    exit /b 1
)

curl -s -f http://localhost:3080/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] 等待服务启动... (!attempts!/30^)
    timeout /t 10 /nobreak >nul
    goto wait_loop
)

echo [SUCCESS] ChatGLM服务已就绪

REM 显示服务状态
echo.
echo [INFO] ========================================
echo [INFO] 部署完成！服务访问信息：
echo [INFO] ========================================
echo [INFO] ChatGLM Web应用: http://localhost:3080
echo [INFO] MongoDB数据库: localhost:27017
echo [INFO] Redis缓存: localhost:6379
echo [INFO] ========================================
echo.

REM 检查服务状态
docker-compose -f docker-compose.chatglm.yml ps

echo.
echo [SUCCESS] 部署完成！请在浏览器中访问 http://localhost:3080
echo [INFO] 按任意键退出...
pause