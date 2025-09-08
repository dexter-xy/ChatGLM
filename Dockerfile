# ChatGLM网页对话应用 - Docker镜像
FROM node:18-alpine AS base

# 安装必需的系统依赖
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# 设置工作目录和用户
RUN mkdir -p /app && chown node:node /app
WORKDIR /app
USER node

# 复制package文件并安装依赖
COPY --chown=node:node package.json ./
COPY --chown=node:node api/package.json ./api/
COPY --chown=node:node client/package.json ./client/

# 安装依赖
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 15000 && \
    npm install --silent

# 复制源代码
COPY --chown=node:node . .

# 构建前端应用
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run frontend && \
    npm prune --production && \
    npm cache clean --force

# 创建必要的目录
RUN mkdir -p /app/client/public/images /app/data/uploads /app/logs

# 暴露端口
EXPOSE 3080

# 设置环境变量
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3080/health || exit 1

# 启动命令
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "backend"]
