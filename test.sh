#!/bin/bash

#=============================================================================
# ChatGLM网页对话应用测试脚本
# 用于验证服务功能和API连接
#=============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
API_BASE="http://localhost:3080"
API_TIMEOUT=30

# 日志函数
log_info() {
    echo -e "${BLUE}[TEST INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[TEST PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[TEST WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[TEST FAIL]${NC} $1"
}

# 测试计数器
total_tests=0
passed_tests=0
failed_tests=0

# 增加测试计数
count_test() {
    ((total_tests++))
    if [ "$1" = "pass" ]; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
}

# 测试API连通性
test_api_health() {
    log_info "测试API健康检查端点..."
    
    local response
    response=$(curl -s -w "%{http_code}" --max-time $API_TIMEOUT "$API_BASE/health" || echo "000")
    
    if [ "${response: -3}" = "200" ]; then
        log_success "API健康检查通过"
        count_test "pass"
        return 0
    else
        log_error "API健康检查失败 (HTTP ${response: -3})"
        count_test "fail"
        return 1
    fi
}

# 测试前端页面加载
test_frontend_loading() {
    log_info "测试前端页面加载..."
    
    local response
    response=$(curl -s -w "%{http_code}" --max-time $API_TIMEOUT "$API_BASE/" || echo "000")
    
    if [ "${response: -3}" = "200" ]; then
        log_success "前端页面加载正常"
        count_test "pass"
        return 0
    else
        log_error "前端页面加载失败 (HTTP ${response: -3})"
        count_test "fail"
        return 1
    fi
}

# 测试配置API
test_config_api() {
    log_info "测试配置API..."
    
    local response
    response=$(curl -s -w "%{http_code}" --max-time $API_TIMEOUT "$API_BASE/api/config" || echo "000")
    
    if [ "${response: -3}" = "200" ]; then
        # 检查响应内容是否包含ChatGLM配置
        local content="${response%???}"
        if echo "$content" | grep -q "ChatGLM\|chatglm"; then
            log_success "配置API正常，包含ChatGLM配置"
            count_test "pass"
            return 0
        else
            log_warning "配置API响应正常，但未找到ChatGLM配置"
            count_test "fail"
            return 1
        fi
    else
        log_error "配置API请求失败 (HTTP ${response: -3})"
        count_test "fail"
        return 1
    fi
}

# 测试模型API
test_models_api() {
    log_info "测试模型API..."
    
    local response
    response=$(curl -s -w "%{http_code}" --max-time $API_TIMEOUT "$API_BASE/api/models" || echo "000")
    
    if [ "${response: -3}" = "200" ]; then
        local content="${response%???}"
        if echo "$content" | grep -q "chatglm"; then
            log_success "模型API正常，找到ChatGLM模型"
            count_test "pass"
            return 0
        else
            log_warning "模型API响应正常，但未找到ChatGLM模型"
            count_test "fail"
            return 1
        fi
    else
        log_error "模型API请求失败 (HTTP ${response: -3})"
        count_test "fail"
        return 1
    fi
}

# 测试数据库连接
test_database_connection() {
    log_info "测试数据库连接..."
    
    if docker-compose -f docker-compose.chatglm.yml exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping').ok" ChatGLM 2>/dev/null | grep -q "1"; then
        log_success "MongoDB数据库连接正常"
        count_test "pass"
        return 0
    else
        log_error "MongoDB数据库连接失败"
        count_test "fail"
        return 1
    fi
}

# 测试Redis连接（如果启用）
test_redis_connection() {
    log_info "测试Redis连接..."
    
    if docker-compose -f docker-compose.chatglm.yml ps | grep -q "chatglm-redis.*Up"; then
        if docker-compose -f docker-compose.chatglm.yml exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
            log_success "Redis连接正常"
            count_test "pass"
            return 0
        else
            log_error "Redis连接失败"
            count_test "fail"
            return 1
        fi
    else
        log_warning "Redis服务未启动或未配置"
        count_test "pass"
        return 0
    fi
}

# 测试ChatGLM API连接
test_chatglm_api() {
    log_info "测试ChatGLM API连接..."
    
    # 读取环境变量
    if [ -f ".env" ]; then
        source .env 2>/dev/null || true
    fi
    
    if [ -z "$CHATGLM_API_KEY" ] || [ -z "$CHATGLM_ENDPOINT" ]; then
        log_warning "ChatGLM API配置未设置，跳过API连接测试"
        count_test "pass"
        return 0
    fi
    
    # 构建测试请求
    local test_payload='{
        "model": "chatglm-6b",
        "messages": [{"role": "user", "content": "测试连接"}],
        "max_tokens": 50,
        "stream": false
    }'
    
    local response
    response=$(curl -s -w "%{http_code}" --max-time $API_TIMEOUT \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $CHATGLM_API_KEY" \
        -d "$test_payload" \
        "$CHATGLM_ENDPOINT" || echo "000")
    
    local http_code="${response: -3}"
    local content="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        if echo "$content" | grep -q "choices\|content"; then
            log_success "ChatGLM API连接正常，响应格式正确"
            count_test "pass"
            return 0
        else
            log_warning "ChatGLM API连接成功，但响应格式异常"
            count_test "fail"
            return 1
        fi
    elif [ "$http_code" = "401" ]; then
        log_error "ChatGLM API密钥无效 (HTTP 401)"
        count_test "fail"
        return 1
    elif [ "$http_code" = "429" ]; then
        log_warning "ChatGLM API请求频率限制 (HTTP 429)"
        count_test "pass"
        return 0
    else
        log_error "ChatGLM API连接失败 (HTTP $http_code)"
        count_test "fail"
        return 1
    fi
}

# 测试服务资源使用
test_resource_usage() {
    log_info "测试服务资源使用情况..."
    
    # 检查容器状态
    local containers=$(docker-compose -f docker-compose.chatglm.yml ps -q)
    
    for container in $containers; do
        if [ -n "$container" ]; then
            local stats=$(docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $container)
            log_info "$stats"
        fi
    done
    
    # 检查磁盘使用
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}')
    log_info "磁盘使用率: $disk_usage"
    
    # 检查内存使用
    local mem_usage=$(free -m | awk 'NR==2{printf "%.1f%%\n", $3*100/$2}')
    log_info "内存使用率: $mem_usage"
    
    log_success "资源使用情况检查完成"
    count_test "pass"
}

# 生成测试报告
generate_report() {
    echo ""
    echo "=================================="
    echo "        测试结果报告"
    echo "=================================="
    echo "总测试数: $total_tests"
    echo "通过测试: $passed_tests"
    echo "失败测试: $failed_tests"
    echo "成功率: $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l)%"
    echo "=================================="
    
    if [ $failed_tests -eq 0 ]; then
        log_success "所有测试通过！ChatGLM应用运行正常"
        return 0
    else
        log_error "有 $failed_tests 个测试失败，请检查服务配置"
        return 1
    fi
}

# 主测试函数
run_all_tests() {
    log_info "开始ChatGLM应用功能测试..."
    echo ""
    
    # 基础服务测试
    test_api_health
    test_frontend_loading
    test_config_api
    test_models_api
    
    # 数据库测试
    test_database_connection
    test_redis_connection
    
    # 外部API测试
    test_chatglm_api
    
    # 资源使用测试
    test_resource_usage
    
    # 生成报告
    generate_report
}

# 快速健康检查
quick_check() {
    log_info "执行快速健康检查..."
    
    test_api_health
    test_database_connection
    
    if [ $failed_tests -eq 0 ]; then
        log_success "快速检查通过，服务运行正常"
        return 0
    else
        log_error "快速检查失败，服务可能存在问题"
        return 1
    fi
}

# 显示帮助信息
show_help() {
    echo "ChatGLM应用测试脚本"
    echo ""
    echo "使用方法: $0 [command]"
    echo ""
    echo "可用命令:"
    echo "  full       - 运行完整测试套件 (默认)"
    echo "  quick      - 快速健康检查"
    echo "  api        - 仅测试API端点"
    echo "  db         - 仅测试数据库连接"
    echo "  chatglm    - 仅测试ChatGLM API连接"
    echo "  help       - 显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 full      # 完整测试"
    echo "  $0 quick     # 快速检查"
    echo "  $0 api       # API测试"
}

# 主函数
main() {
    local command=${1:-full}
    
    case $command in
        full)
            run_all_tests
            ;;
        quick)
            quick_check
            ;;
        api)
            test_api_health
            test_config_api
            test_models_api
            generate_report
            ;;
        db)
            test_database_connection
            test_redis_connection
            generate_report
            ;;
        chatglm)
            test_chatglm_api
            generate_report
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