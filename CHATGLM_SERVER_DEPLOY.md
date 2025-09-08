# ChatGLM服务器部署指南
# 如何在服务器上部署ChatGLM模型并暴露API接口

## 🎯 部署目标

在服务器上部署ChatGLM模型，提供OpenAI兼容的API接口，供LibreChat项目调用。

## 📋 方案选择

### 方案一：使用官方ChatGLM-6B + FastAPI (推荐)

### 方案二：使用Ollama部署ChatGLM

### 方案三：使用vLLM高性能部署
### 方案四：使用Xinference统一推理框架

---

## 🚀 方案一：ChatGLM-6B + FastAPI (推荐)

### 1. 服务器环境要求
```bash
# 硬件要求
GPU: 12GB+ VRAM (RTX 3060 12GB / RTX 4070以上)
CPU: 8核心以上
内存: 32GB+
存储: 50GB+ SSD

# 软件环境
Ubuntu 20.04+ / CentOS 7+
Python 3.8+
CUDA 11.7+
Docker (可选)
```

### 2. 环境准备脚本
```bash
#!/bin/bash
# chatglm-server-setup.sh

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Python和必要工具
sudo apt install -y python3.8 python3.8-venv python3.8-dev
sudo apt install -y build-essential git curl wget

# 安装NVIDIA驱动和CUDA (如果需要)
sudo apt install -y nvidia-driver-525
wget https://developer.download.nvidia.com/compute/cuda/11.7.0/local_installers/cuda_11.7.0_515.43.04_linux.run
sudo sh cuda_11.7.0_515.43.04_linux.run --silent --toolkit

# 安装Docker (可选)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

echo "环境准备完成，请重启服务器"
```

### 3. ChatGLM API服务代码
```python
# chatglm_api_server.py
"""
ChatGLM-6B API服务器
提供OpenAI兼容的API接口
"""

import os
import json
import time
import uuid
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime

import torch
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModel
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API模型定义
class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str = "chatglm-6b"
    messages: List[Message]
    temperature: float = 0.7
    max_tokens: int = 2048
    stream: bool = False
    top_p: float = 0.8

class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]

# ChatGLM模型加载器
class ChatGLMModel:
    def __init__(self, model_path: str = "THUDM/chatglm-6b"):
        self.model_path = model_path
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    def load_model(self):
        """加载ChatGLM模型"""
        try:
            logger.info(f"开始加载ChatGLM模型: {self.model_path}")
            logger.info(f"使用设备: {self.device}")
            
            # 加载tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_path, 
                trust_remote_code=True
            )
            
            # 加载模型
            self.model = AutoModel.from_pretrained(
                self.model_path, 
                trust_remote_code=True
            ).half().cuda() if self.device == "cuda" else AutoModel.from_pretrained(
                self.model_path, 
                trust_remote_code=True
            )
            
            # 设置为评估模式
            self.model = self.model.eval()
            
            logger.info("ChatGLM模型加载完成")
            return True
            
        except Exception as e:
            logger.error(f"模型加载失败: {str(e)}")
            return False
    
    def chat(self, query: str, history: List = None, **kwargs) -> tuple:
        """ChatGLM对话生成"""
        if not self.model or not self.tokenizer:
            raise RuntimeError("模型未加载")
        
        try:
            history = history or []
            
            # 使用ChatGLM的chat方法
            response, history = self.model.chat(
                self.tokenizer,
                query,
                history=history,
                temperature=kwargs.get('temperature', 0.7),
                max_length=kwargs.get('max_tokens', 2048),
                top_p=kwargs.get('top_p', 0.8)
            )
            
            return response, history
            
        except Exception as e:
            logger.error(f"对话生成失败: {str(e)}")
            raise
    
    async def chat_stream(self, query: str, history: List = None, **kwargs) -> AsyncGenerator[str, None]:
        """ChatGLM流式对话生成"""
        if not self.model or not self.tokenizer:
            raise RuntimeError("模型未加载")
        
        try:
            history = history or []
            
            # 使用ChatGLM的stream_chat方法
            for response, history in self.model.stream_chat(
                self.tokenizer,
                query,
                history=history,
                temperature=kwargs.get('temperature', 0.7),
                max_length=kwargs.get('max_tokens', 2048),
                top_p=kwargs.get('top_p', 0.8)
            ):
                yield response
                await asyncio.sleep(0.01)  # 控制输出频率
                
        except Exception as e:
            logger.error(f"流式对话生成失败: {str(e)}")
            raise

# 初始化FastAPI应用
app = FastAPI(
    title="ChatGLM API Server",
    description="ChatGLM-6B OpenAI兼容API服务",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局模型实例
chatglm_model = ChatGLMModel()

@app.on_event("startup")
async def startup_event():
    """应用启动时加载模型"""
    logger.info("启动ChatGLM API服务器...")
    success = chatglm_model.load_model()
    if not success:
        logger.error("模型加载失败，服务器将无法正常工作")
    else:
        logger.info("ChatGLM API服务器启动完成")

@app.get("/")
async def root():
    """根路径健康检查"""
    return {
        "message": "ChatGLM API Server", 
        "status": "running",
        "model_loaded": chatglm_model.model is not None
    }

@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": chatglm_model.model is not None,
        "gpu_available": torch.cuda.is_available(),
        "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
    }

@app.get("/v1/models")
async def list_models():
    """列出可用模型"""
    return {
        "object": "list",
        "data": [
            {
                "id": "chatglm-6b",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "chatglm",
                "permission": [],
                "root": "chatglm-6b",
                "parent": None,
            }
        ]
    }

def messages_to_query(messages: List[Message]) -> tuple:
    """将OpenAI消息格式转换为ChatGLM查询格式"""
    history = []
    query = ""
    
    for i, message in enumerate(messages):
        if message.role == "system":
            # 系统消息作为前置指令
            continue
        elif message.role == "user":
            if i == len(messages) - 1:  # 最后一条用户消息
                query = message.content
            else:
                # 历史用户消息
                history.append([message.content, ""])
        elif message.role == "assistant":
            # 助手回复，更新history中对应的回复
            if history:
                history[-1][1] = message.content
    
    return query, history

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """OpenAI兼容的聊天完成接口"""
    try:
        # 转换消息格式
        query, history = messages_to_query(request.messages)
        
        if not query:
            raise HTTPException(status_code=400, detail="无效的消息格式")
        
        # 如果是流式请求
        if request.stream:
            return StreamingResponse(
                stream_chat_response(request, query, history),
                media_type="text/plain"
            )
        
        # 非流式请求
        response, new_history = chatglm_model.chat(
            query=query,
            history=history,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p
        )
        
        # 构造响应
        return ChatCompletionResponse(
            id=f"chatcmpl-{str(uuid.uuid4())}",
            created=int(time.time()),
            model=request.model,
            choices=[
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response
                    },
                    "finish_reason": "stop"
                }
            ],
            usage={
                "prompt_tokens": len(query),
                "completion_tokens": len(response),
                "total_tokens": len(query) + len(response)
            }
        )
        
    except Exception as e:
        logger.error(f"聊天完成请求失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def stream_chat_response(request: ChatCompletionRequest, query: str, history: List):
    """流式聊天响应生成器"""
    try:
        chat_id = f"chatcmpl-{str(uuid.uuid4())}"
        created = int(time.time())
        
        # 发送初始块
        yield f"data: {json.dumps({
            'id': chat_id,
            'object': 'chat.completion.chunk',
            'created': created,
            'model': request.model,
            'choices': [{
                'index': 0,
                'delta': {'role': 'assistant', 'content': ''},
                'finish_reason': None
            }]
        }, ensure_ascii=False)}\n\n"
        
        # 流式生成内容
        full_response = ""
        async for token in chatglm_model.chat_stream(
            query=query,
            history=history,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p
        ):
            # 计算增量内容
            delta_content = token[len(full_response):]
            full_response = token
            
            if delta_content:
                chunk_data = {
                    'id': chat_id,
                    'object': 'chat.completion.chunk',
                    'created': created,
                    'model': request.model,
                    'choices': [{
                        'index': 0,
                        'delta': {'content': delta_content},
                        'finish_reason': None
                    }]
                }
                yield f"data: {json.dumps(chunk_data, ensure_ascii=False)}\n\n"
        
        # 发送结束块
        final_chunk = {
            'id': chat_id,
            'object': 'chat.completion.chunk',
            'created': created,
            'model': request.model,
            'choices': [{
                'index': 0,
                'delta': {},
                'finish_reason': 'stop'
            }]
        }
        yield f"data: {json.dumps(final_chunk, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        error_chunk = {
            'error': {
                'message': str(e),
                'type': 'internal_server_error'
            }
        }
        yield f"data: {json.dumps(error_chunk, ensure_ascii=False)}\n\n"

if __name__ == "__main__":
    # 启动服务器
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    )
```

### 4. 依赖文件
```text
# requirements.txt
torch>=1.13.0
transformers>=4.27.0
fastapi>=0.95.0
uvicorn>=0.21.0
pydantic>=1.10.0
python-multipart>=0.0.6
accelerate>=0.18.0
sentencepiece>=0.1.97
protobuf>=3.20.0
```

### 5. 启动脚本
```bash
#!/bin/bash
# start_chatglm_server.sh

echo "启动ChatGLM API服务器..."

# 创建虚拟环境
python3.8 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 设置环境变量
export CUDA_VISIBLE_DEVICES=0
export TRANSFORMERS_CACHE=./models

# 下载模型 (首次运行)
python -c "
from transformers import AutoTokenizer, AutoModel
print('开始下载ChatGLM-6B模型...')
tokenizer = AutoTokenizer.from_pretrained('THUDM/chatglm-6b', trust_remote_code=True)
model = AutoModel.from_pretrained('THUDM/chatglm-6b', trust_remote_code=True)
print('模型下载完成')
"

# 启动API服务器
python chatglm_api_server.py
```

---

## 🐳 Docker容器化部署

### 1. Dockerfile
```dockerfile
# Dockerfile
FROM nvidia/cuda:11.7-devel-ubuntu20.04

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 安装Python和必要工具
RUN apt-get update && apt-get install -y \
    python3.8 \
    python3.8-dev \
    python3.8-venv \
    python3-pip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip3 install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY chatglm_api_server.py .

# 创建模型缓存目录
RUN mkdir -p /app/models

# 设置环境变量
ENV TRANSFORMERS_CACHE=/app/models
ENV CUDA_VISIBLE_DEVICES=0

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["python3", "chatglm_api_server.py"]
```

### 2. Docker Compose配置
```yaml
# docker-compose.chatglm-server.yml
version: '3.8'

services:
  chatglm-server:
    build: .
    container_name: chatglm-api-server
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      - ./models:/app/models
      - ./logs:/app/logs
    environment:
      - CUDA_VISIBLE_DEVICES=0
      - TRANSFORMERS_CACHE=/app/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Nginx反向代理 (可选)
  nginx:
    image: nginx:alpine
    container_name: chatglm-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - chatglm-server

volumes:
  models:
    driver: local
```

### 3. 部署命令
```bash
# 构建并启动服务
docker-compose -f docker-compose.chatglm-server.yml up -d --build

# 查看日志
docker-compose -f docker-compose.chatglm-server.yml logs -f

# 测试API
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chatglm-6b",
    "messages": [{"role": "user", "content": "你好"}],
    "temperature": 0.7,
    "stream": false
  }'
```

---

## 🔗 LibreChat集成配置

### 1. 修改LibreChat的.env文件
```env
# ChatGLM服务器配置
CHATGLM_API_KEY=sk-chatglm-your-api-key-here
CHATGLM_ENDPOINT=http://your-server-ip:8000/v1/chat/completions

# 或者使用域名
# CHATGLM_ENDPOINT=https://chatglm.yourserver.com/v1/chat/completions
```

### 2. 更新librechat.yaml
```yaml
# librechat.yaml
version: 1.0.0

endpoints:
  custom:
    - name: "ChatGLM-6B"
      apiKey: "${CHATGLM_API_KEY}"
      baseURL: "${CHATGLM_ENDPOINT}"
      models:
        default: ["chatglm-6b"]
        fetch: false
      titleConvo: true
      titleModel: "chatglm-6b"
      summarize: false
      summaryModel: "chatglm-6b"
      forcePrompt: false
      modelDisplayLabel: "ChatGLM-6B"
      iconURL: "https://your-server.com/chatglm-icon.png"
```

---

## 🔧 Nginx反向代理配置

```nginx
# nginx.conf
upstream chatglm_backend {
    server chatglm-server:8000;
}

server {
    listen 80;
    server_name your-domain.com;
    
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
}

# HTTPS配置 (可选)
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
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
}
```

---

## 📊 性能优化建议

### 1. 模型优化
```python
# 模型量化优化
from transformers import AutoModel, AutoTokenizer

# INT8量化
model = AutoModel.from_pretrained(
    "THUDM/chatglm-6b", 
    trust_remote_code=True,
    torch_dtype=torch.float16,
    device_map="auto"
).quantize(8)

# 使用多GPU
model = AutoModel.from_pretrained(
    "THUDM/chatglm-6b", 
    trust_remote_code=True,
    device_map="auto"  # 自动分配GPU
)
```

### 2. 服务器配置
```bash
# 系统优化
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf

# GPU优化
nvidia-smi -pm 1
nvidia-smi -ac 5001,1590  # 根据显卡调整
```

### 3. 监控脚本
```bash
#!/bin/bash
# monitor.sh
while true; do
    echo "=== $(date) ==="
    echo "GPU使用率:"
    nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits
    echo "内存使用:"
    free -h | grep Mem
    echo "API状态:"
    curl -s http://localhost:8000/health | jq '.'
    echo "========================"
    sleep 30
done
```

---

这样您就有了一个完整的ChatGLM服务器部署方案，可以为LibreChat项目提供API服务。