# ChatGLM网页对话应用部署指南

## 项目概述

这是一个基于LibreChat框架定制的ChatGLM专用网页对话应用。该应用移除了LibreChat的多API支持，专注于提供ChatGLM模型的对话服务，并针对中文用户进行了优化。

## 功能特性

- ✅ **专用ChatGLM集成** - 完整支持ChatGLM API调用
- ✅ **中文界面优化** - 完整的中文本地化支持
- ✅ **简化用户界面** - 移除复杂的模型选择，专注ChatGLM体验
- ✅ **流式对话支持** - 支持实时流式响应
- ✅ **对话历史管理** - 完整的会话存储和管理
- ✅ **响应式设计** - 支持桌面端和移动端访问
- ✅ **Docker部署** - 一键容器化部署
- ✅ **安全认证** - JWT用户认证系统

## 系统要求

### 最低配置
- **CPU**: 2核心
- **内存**: 4GB RAM
- **存储**: 10GB可用空间
- **网络**: 稳定的互联网连接

### 推荐配置
- **CPU**: 4核心或以上
- **内存**: 8GB RAM或以上
- **存储**: 20GB可用空间
- **网络**: 带宽≥10Mbps

### 软件依赖
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git (可选)
- curl (用于健康检查)

## 快速部署

### 1. 获取代码

```bash
# 克隆仓库
git clone <repository-url>
cd ChatGLM

# 或下载源码包并解压
wget <source-package-url>
unzip ChatGLM-source.zip
cd ChatGLM
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.chatglm.example .env

# 编辑配置文件
nano .env
```

**必需配置项：**

```bash
# ChatGLM API配置（必填）
CHATGLM_API_KEY=your_chatglm_api_key_here
CHATGLM_ENDPOINT=https://your-cloud-platform.com/api/v1/chat/completions

# JWT密钥配置（必填，请替换为随机密钥）
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# 数据库配置（可选）
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=your-secure-password
```

### 3. 一键部署

```bash
# 给部署脚本执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh deploy
```

### 4. 验证部署

部署完成后，访问 http://localhost:3080 即可使用ChatGLM对话应用。

## 详细配置

### 环境变量说明

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `CHATGLM_API_KEY` | ChatGLM API密钥 | - | ✅ |
| `CHATGLM_ENDPOINT` | ChatGLM API端点 | - | ✅ |
| `CHATGLM_DEFAULT_MODEL` | 默认模型名称 | chatglm-6b | ❌ |
| `JWT_SECRET` | JWT签名密钥 | - | ✅ |
| `JWT_REFRESH_SECRET` | JWT刷新密钥 | - | ✅ |
| `APP_TITLE` | 应用标题 | ChatGLM对话助手 | ❌ |
| `DEFAULT_LANGUAGE` | 默认语言 | zh-CN | ❌ |
| `ALLOW_REGISTRATION` | 允许用户注册 | false | ❌ |
| `MONGO_ROOT_USER` | MongoDB管理员用户名 | admin | ❌ |
| `MONGO_ROOT_PASSWORD` | MongoDB管理员密码 | password123 | ❌ |

### ChatGLM API配置

#### 获取API密钥
1. 访问您的ChatGLM云服务提供商控制台
2. 创建API密钥
3. 复制API密钥和端点地址
4. 在`.env`文件中配置

#### API端点格式
```bash
# 标准OpenAI兼容格式
CHATGLM_ENDPOINT=https://api.your-provider.com/v1/chat/completions

# 带认证的端点
CHATGLM_ENDPOINT=https://api.your-provider.com/v1/chat/completions
CHATGLM_API_KEY=sk-your-api-key-here
```

### 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| Web应用 | 3080 | 主应用访问端口 |
| MongoDB | 27017 | 数据库端口 |
| Redis | 6379 | 缓存端口 |
| Nginx | 80/443 | 反向代理端口 |

### 数据持久化

应用数据存储在Docker卷中：

```bash
# 查看数据卷
docker volume ls | grep chatglm

# 备份数据
docker run --rm -v chatglm_mongodb_data:/source -v $(pwd):/backup alpine tar czf /backup/mongodb-backup.tar.gz -C /source .

# 恢复数据
docker run --rm -v chatglm_mongodb_data:/target -v $(pwd):/backup alpine tar xzf /backup/mongodb-backup.tar.gz -C /target
```

## 管理命令

### 部署脚本使用

```bash
# 完整部署
./deploy.sh deploy

# 启动服务
./deploy.sh start

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看状态
./deploy.sh status

# 查看日志
./deploy.sh logs

# 更新服务
./deploy.sh update

# 清理资源
./deploy.sh cleanup

# 显示帮助
./deploy.sh help
```

### Docker Compose命令

```bash
# 使用专用配置启动
docker-compose -f docker-compose.chatglm.yml up -d

# 停止所有服务
docker-compose -f docker-compose.chatglm.yml down

# 查看服务状态
docker-compose -f docker-compose.chatglm.yml ps

# 查看日志
docker-compose -f docker-compose.chatglm.yml logs -f chatglm-api

# 重启单个服务
docker-compose -f docker-compose.chatglm.yml restart chatglm-api
```

## 监控和日志

### 健康检查

```bash
# API健康检查
curl http://localhost:3080/health

# 服务状态检查
./deploy.sh status
```

### 日志查看

```bash
# 查看应用日志
docker-compose -f docker-compose.chatglm.yml logs chatglm-api

# 查看数据库日志
docker-compose -f docker-compose.chatglm.yml logs mongodb

# 查看实时日志
docker-compose -f docker-compose.chatglm.yml logs -f
```

### 性能监控

应用提供以下监控端点：

- `GET /health` - 健康检查
- `GET /api/config` - 配置信息
- `GET /api/models` - 模型信息

## 故障排除

### 常见问题

#### 1. 服务启动失败

**问题**: 容器无法启动

**解决方案**:
```bash
# 检查Docker状态
sudo systemctl status docker

# 查看详细错误日志
docker-compose -f docker-compose.chatglm.yml logs

# 检查端口占用
netstat -tlnp | grep :3080
```

#### 2. ChatGLM API连接失败

**问题**: 无法连接到ChatGLM服务

**解决方案**:
```bash
# 检查API密钥和端点配置
cat .env | grep CHATGLM

# 测试API连接
curl -H "Authorization: Bearer $CHATGLM_API_KEY" $CHATGLM_ENDPOINT

# 查看应用日志
docker logs chatglm-web-app
```

#### 3. 数据库连接问题

**问题**: MongoDB连接失败

**解决方案**:
```bash
# 检查MongoDB状态
docker-compose -f docker-compose.chatglm.yml exec mongodb mongosh --eval "db.adminCommand('ping')"

# 重启数据库
docker-compose -f docker-compose.chatglm.yml restart mongodb

# 检查数据库日志
docker-compose -f docker-compose.chatglm.yml logs mongodb
```

#### 4. 内存不足

**问题**: 服务因内存不足崩溃

**解决方案**:
```bash
# 检查系统资源
free -h
df -h

# 限制容器内存使用
# 在docker-compose.chatglm.yml中添加：
# deploy:
#   resources:
#     limits:
#       memory: 2G
```

### 调试模式

启用调试模式获取更多日志信息：

```bash
# 在.env文件中设置
DEBUG_LOGGING=true
LOG_LEVEL=debug

# 重启服务
./deploy.sh restart
```

## 升级指南

### 版本升级

```bash
# 1. 备份数据
./deploy.sh stop
docker run --rm -v chatglm_mongodb_data:/source -v $(pwd):/backup alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz -C /source .

# 2. 更新代码
git pull origin main

# 3. 执行升级
./deploy.sh update

# 4. 验证服务
./deploy.sh status
```

### 配置迁移

从旧版本迁移配置：

```bash
# 比较配置文件差异
diff .env.chatglm.example .env

# 手动添加新配置项
# 参考最新的.env.chatglm.example文件
```

## 安全建议

### 生产环境安全

1. **更改默认密码**
   ```bash
   # 生成安全密钥
   openssl rand -hex 32
   ```

2. **限制网络访问**
   ```bash
   # 仅允许特定IP访问
   # 在docker-compose.chatglm.yml中配置
   ```

3. **启用HTTPS**
   ```bash
   # 配置SSL证书
   # 更新nginx配置
   ```

4. **定期备份**
   ```bash
   # 设置定时备份任务
   crontab -e
   # 添加: 0 2 * * * /path/to/backup-script.sh
   ```

### API安全

- 定期轮换API密钥
- 监控API使用量
- 设置合理的速率限制
- 记录和分析访问日志

## 许可证

本项目基于LibreChat开源协议。详见 [LICENSE](LICENSE) 文件。

## 支持和反馈

如果您在使用过程中遇到问题：

1. 查看本文档的故障排除部分
2. 检查项目Issues页面
3. 提交新的Issue描述问题

## 更新日志

### v1.0.0 (2025-09-08)
- 初始版本发布
- 基于LibreChat v0.8.0-rc3
- 完整ChatGLM集成
- 中文界面优化
- Docker部署支持