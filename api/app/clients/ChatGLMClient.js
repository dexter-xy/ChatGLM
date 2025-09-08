const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { TextStream } = require('./TextStream');
const BaseClient = require('./BaseClient');
const { logger } = require('@librechat/data-schemas');

/**
 * ChatGLM API客户端
 * 基于OpenAI兼容接口格式，适配云算力平台的ChatGLM模型
 */
class ChatGLMClient extends BaseClient {
  constructor(options = {}) {
    super();
    
    this.apiKey = options.apiKey || process.env.CHATGLM_API_KEY;
    this.baseURL = options.baseURL || process.env.CHATGLM_ENDPOINT;
    this.model = options.model || 'chatglm-6b';
    
    if (!this.apiKey) {
      throw new Error('ChatGLM API key is required');
    }
    
    if (!this.baseURL) {
      throw new Error('ChatGLM endpoint URL is required');
    }

    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'LibreChat-ChatGLM/1.0.0',
    };

    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * 发送消息到ChatGLM API
   * @param {Object} payload - 请求载荷
   * @param {Object} options - 选项
   * @returns {Promise} 响应流或响应对象
   */
  async sendMessage(payload, options = {}) {
    const { stream = true, ...requestOptions } = options;
    
    // 构建请求体
    const requestBody = {
      model: payload.model || this.model,
      messages: this.formatMessages(payload.messages || []),
      stream: stream,
      temperature: payload.temperature || 0.7,
      max_tokens: payload.max_tokens || 2048,
      top_p: payload.top_p || 0.8,
      ...requestOptions,
    };

    logger.info(`ChatGLM API Request: ${JSON.stringify(requestBody, null, 2)}`);

    if (stream) {
      return this.streamMessage(requestBody);
    } else {
      return this.completeMessage(requestBody);
    }
  }

  /**
   * 流式响应处理
   * @param {Object} requestBody - 请求体
   * @returns {Promise<ReadableStream>} 响应流
   */
  async streamMessage(requestBody) {
    try {
      const response = await this.makeRequest(requestBody);
      return new TextStream(response, this.extractStreamContent.bind(this));
    } catch (error) {
      logger.error('ChatGLM stream error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 非流式响应处理
   * @param {Object} requestBody - 请求体
   * @returns {Promise<Object>} 响应对象
   */
  async completeMessage(requestBody) {
    try {
      const requestBodyNoStream = { ...requestBody, stream: false };
      const response = await this.makeRequest(requestBodyNoStream);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'ChatGLM API error');
      }

      return this.formatResponse(data);
    } catch (error) {
      logger.error('ChatGLM completion error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 发起HTTP请求
   * @param {Object} requestBody - 请求体
   * @param {number} retryCount - 重试次数
   * @returns {Promise<Response>} HTTP响应
   */
  async makeRequest(requestBody, retryCount = 0) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
        timeout: 30000, // 30秒超时
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        logger.warn(`ChatGLM request failed, retrying... (${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(this.retryDelay * (retryCount + 1));
        return this.makeRequest(requestBody, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * 格式化输入消息
   * @param {Array} messages - 原始消息数组
   * @returns {Array} 格式化后的消息数组
   */
  formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role || 'user',
      content: this.sanitizeContent(msg.content || ''),
    }));
  }

  /**
   * 清理消息内容
   * @param {string} content - 原始内容
   * @returns {string} 清理后的内容
   */
  sanitizeContent(content) {
    if (typeof content !== 'string') {
      return String(content);
    }
    
    // 移除潜在的恶意内容
    return content
      .replace(/[\x00-\x1f\x7f]/g, '') // 移除控制字符
      .trim()
      .slice(0, 4000); // 限制长度
  }

  /**
   * 从流式响应中提取内容
   * @param {string} chunk - 响应块
   * @returns {Object|null} 提取的内容
   */
  extractStreamContent(chunk) {
    try {
      if (!chunk || chunk.trim() === '') {
        return null;
      }

      // 处理Server-Sent Events格式
      if (chunk.startsWith('data: ')) {
        chunk = chunk.slice(6);
      }

      if (chunk === '[DONE]') {
        return { done: true };
      }

      const data = JSON.parse(chunk);
      
      if (data.choices && data.choices[0] && data.choices[0].delta) {
        const delta = data.choices[0].delta;
        return {
          content: delta.content || '',
          role: delta.role || 'assistant',
          finish_reason: data.choices[0].finish_reason,
        };
      }

      return null;
    } catch (error) {
      logger.warn('Failed to parse stream chunk:', chunk, error);
      return null;
    }
  }

  /**
   * 格式化最终响应
   * @param {Object} data - 原始响应数据
   * @returns {Object} 格式化后的响应
   */
  formatResponse(data) {
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response format from ChatGLM API');
    }

    const choice = data.choices[0];
    const message = choice.message || {};

    return {
      id: data.id || uuidv4(),
      object: data.object || 'chat.completion',
      created: data.created || Math.floor(Date.now() / 1000),
      model: data.model || this.model,
      choices: [{
        index: 0,
        message: {
          role: message.role || 'assistant',
          content: message.content || '',
        },
        finish_reason: choice.finish_reason || 'stop',
      }],
      usage: data.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  /**
   * 错误处理
   * @param {Error} error - 原始错误
   * @returns {Error} 处理后的错误
   */
  handleError(error) {
    logger.error('ChatGLM Client Error:', error);

    if (error.message.includes('ECONNREFUSED')) {
      return new Error('Unable to connect to ChatGLM service. Please check the endpoint configuration.');
    }

    if (error.message.includes('401')) {
      return new Error('Invalid ChatGLM API key. Please check your credentials.');
    }

    if (error.message.includes('429')) {
      return new Error('ChatGLM API rate limit exceeded. Please try again later.');
    }

    if (error.message.includes('timeout')) {
      return new Error('ChatGLM API request timeout. Please try again.');
    }

    return error;
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise} Promise对象
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取模型信息
   * @returns {Array} 支持的模型列表
   */
  getModels() {
    return [
      {
        id: 'chatglm-6b',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'chatglm',
        permission: [],
        root: 'chatglm-6b',
        parent: null,
      },
      {
        id: 'chatglm2-6b',
        object: 'model', 
        created: Math.floor(Date.now() / 1000),
        owned_by: 'chatglm',
        permission: [],
        root: 'chatglm2-6b',
        parent: null,
      },
      {
        id: 'chatglm3-6b',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'chatglm',
        permission: [],
        root: 'chatglm3-6b',
        parent: null,
      },
    ];
  }
}

module.exports = ChatGLMClient;