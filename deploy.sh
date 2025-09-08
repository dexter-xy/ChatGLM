#!/bin/bash

#=============================================================================
# ChatGLM网页对话应用部署脚本
# 基于LibreChat框架的ChatGLM专用部署工具
#=============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必需的命令
check_dependencies() {
    local deps=("docker" "docker-compose" "curl")
    
    for dep in "${deps[@]}"; do
        if ! command -v $dep &> /dev/null; then
            log_error "$dep 未安装，请先安装该依赖"
            exit 1
        fi
    done
    
    log_success "依赖检查通过"
}

# 检查环境变量
check_env_vars() {
    log_info "检查环境变量配置..."
    
    # 检查是否存在.env文件
    if [ ! -f ".env" ]; then
        if [ -f ".env.chatglm.example" ]; then
            log_warning ".env文件不存在，从示例文件复制..."
            cp .env.chatglm.example .env
            log_warning "请编辑 .env 文件并设置正确的ChatGLM API配置"
        else
            log_error ".env文件和示例文件都不存在"
            exit 1
        fi
    fi
    
    # 检查关键环境变量
    source .env 2>/dev/null || true
    
    if [ -z "$CHATGLM_API_KEY" ]; then
        log_error "CHATGLM_API_KEY 未设置，请在.env文件中配置"
        exit 1
    fi
    
    if [ -z "$CHATGLM_ENDPOINT" ]; then
        log_error "CHATGLM_ENDPOINT 未设置，请在.env文件中配置"
        exit 1
    fi
    
    log_success "环境变量检查通过"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录结构..."
    
    local dirs=(
        "data/uploads"
        "data/logs"
        "data/logs/nginx"
        "data/mongo-init"
        "nginx"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    log_success "目录结构创建完成"
}

# 生成Nginx配置
generate_nginx_config() {
    log_info "生成Nginx配置文件..."
    
    cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream chatglm_backend {
        server chatglm-api:3080;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        client_max_body_size 50M;
        
        location / {
            proxy_pass http://chatglm_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300;
            proxy_connect_timeout 300;
            proxy_send_timeout 300;
        }
        
        # 健康检查端点
        location /health {
            proxy_pass http://chatglm_backend/health;
            access_log off;
        }
        
        # 静态文件缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            proxy_pass http://chatglm_backend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF
    
    log_success "Nginx配置文件生成完成"
}

# 生成MongoDB初始化脚本
generate_mongo_init() {
    log_info "生成MongoDB初始化脚本..."
    
    cat > data/mongo-init/init-chatglm.js << 'EOF'
// ChatGLM数据库初始化脚本

// 切换到ChatGLM数据库
db = db.getSiblingDB('ChatGLM');

// 创建用户集合索引
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 });

// 创建对话集合索引
db.conversations.createIndex({ "userId": 1 });
db.conversations.createIndex({ "createdAt": -1 });

// 创建消息集合索引
db.messages.createIndex({ "conversationId": 1 });
db.messages.createIndex({ "userId": 1 });
db.messages.createIndex({ "createdAt": -1 });

// 插入默认配置
db.configs.insertOne({
  _id: "chatglm_default",
  name: "ChatGLM默认配置",
  model: "chatglm-6b",
  temperature: 0.7,
  max_tokens: 2048,
  created_at: new Date()
});

print("ChatGLM数据库初始化完成");
EOF
    
    log_success "MongoDB初始化脚本生成完成"
}

# 构建Docker镜像
build_image() {
    log_info "开始构建ChatGLM Docker镜像..."
    
    # 检查Dockerfile是否存在
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile不存在，请确保在正确的目录中运行脚本"
        exit 1
    fi
    
    # 构建镜像
    docker build -t chatglm-app:latest . --no-cache
    
    if [ $? -eq 0 ]; then
        log_success "Docker镜像构建成功"
    else
        log_error "Docker镜像构建失败"
        exit 1
    fi
}

# 启动服务
start_services() {
    log_info "启动ChatGLM服务..."
    
    # 使用专用的compose文件
    docker-compose -f docker-compose.chatglm.yml up -d
    
    if [ $? -eq 0 ]; then
        log_success "服务启动成功"
    else
        log_error "服务启动失败"
        exit 1
    fi
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f http://localhost:3080/health > /dev/null 2>&1; then
            log_success "ChatGLM服务已就绪"
            break
        fi
        
        log_info "等待服务启动... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "服务启动超时"
        show_logs
        exit 1
    fi
}

# 显示服务日志
show_logs() {
    log_info "显示服务日志..."
    docker-compose -f docker-compose.chatglm.yml logs --tail=50
}

# 显示服务状态
show_status() {
    log_info "服务状态:"
    docker-compose -f docker-compose.chatglm.yml ps
    
    echo ""
    log_info "服务访问地址:"
    echo "  ChatGLM Web应用: http://localhost:3080"
    echo "  MongoDB: localhost:27017"
    echo "  Redis: localhost:6379"
    
    echo ""
    log_info "健康检查:"
    curl -s http://localhost:3080/health && echo " - API服务正常" || echo " - API服务异常"
}

# 停止服务
stop_services() {
    log_info "停止ChatGLM服务..."
    docker-compose -f docker-compose.chatglm.yml down
    log_success "服务已停止"
}

# 清理资源
cleanup() {
    log_warning "清理所有资源，包括数据库数据..."
    read -p "确定要继续吗？这将删除所有数据 (y/N): " confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        docker-compose -f docker-compose.chatglm.yml down -v
        docker rmi chatglm-app:latest 2>/dev/null || true
        log_success "清理完成"
    else
        log_info "取消清理操作"
    fi
}

# 更新服务
update_services() {
    log_info "更新ChatGLM服务..."
    
    # 拉取最新代码 (如果是git仓库)
    if [ -d ".git" ]; then
        git pull origin main || log_warning "git pull失败，请手动更新代码"
    fi
    
    # 重新构建和启动
    build_image
    docker-compose -f docker-compose.chatglm.yml up -d --force-recreate
    wait_for_services
    
    log_success "服务更新完成"
}

# 显示帮助信息
show_help() {
    echo "ChatGLM网页对话应用部署脚本"
    echo ""
    echo "使用方法: $0 [command]"
    echo ""
    echo "可用命令:"
    echo "  deploy     - 完整部署应用 (默认)"
    echo "  start      - 启动服务"
    echo "  stop       - 停止服务"
    echo "  restart    - 重启服务"
    echo "  status     - 显示服务状态"
    echo "  logs       - 显示服务日志"
    echo "  update     - 更新服务"
    echo "  cleanup    - 清理所有资源"
    echo "  help       - 显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 deploy    # 部署应用"
    echo "  $0 status    # 检查状态"
    echo "  $0 logs      # 查看日志"
}

# 主函数
main() {
    local command=${1:-deploy}
    
    case $command in
        deploy)
            log_info "开始部署ChatGLM网页对话应用..."
            check_dependencies
            check_env_vars
            create_directories
            generate_nginx_config
            generate_mongo_init
            build_image
            start_services
            wait_for_services
            show_status
            log_success "部署完成！"
            ;;
        start)
            check_dependencies
            start_services
            wait_for_services
            show_status
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 5
            start_services
            wait_for_services
            show_status
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        update)
            check_dependencies
            update_services
            show_status
            ;;
        cleanup)
            cleanup
            ;;
        help)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 脚本入口点
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi