const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { TextStream } = require('./TextStream');
const BaseClient = require('./BaseClient');
// const { logger } = require('@librechat/data-schemas');

// 临时logger替代
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};

/**
 * Gemini API客户端
 * 基于Google Gemini API，用于测试前端界面
 */
class GeminiClient extends BaseClient {
  constructor(options = {}) {
    super();
    
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    this.model = options.model || 'gemini-pro';
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
    
    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * 发送消息到Gemini API
   * @param {Object} payload - 请求载荷
   * @param {Object} options - 选项
   * @returns {Promise} 响应流或响应对象
   */
  async sendMessage(payload, options = {}) {
    const { stream = false, ...requestOptions } = options;
    
    // Gemini API格式的请求体
    const requestBody = {
      contents: this.formatMessages(payload.messages || []),
      generationConfig: {
        temperature: payload.temperature || 0.7,
        maxOutputTokens: payload.max_tokens || 2048,
        topP: payload.top_p || 0.8,
        ...requestOptions,
      },
    };

    logger.info(`Gemini API Request: ${JSON.stringify(requestBody, null, 2)}`);

    if (stream) {
      return this.streamMessage(requestBody);
    } else {
      return this.completeMessage(requestBody);
    }
  }

  /**
   * 流式响应处理 (Gemini暂不支持，模拟实现)
   * @param {Object} requestBody - 请求体
   * @returns {Promise<ReadableStream>} 响应流
   */
  async streamMessage(requestBody) {
    try {
      // Gemini API不支持真正的流式，我们模拟一个流式响应
      const response = await this.completeMessage(requestBody);
      return this.simulateStream(response.choices[0].message.content);
    } catch (error) {
      logger.error('Gemini stream error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 模拟流式响应
   * @param {string} content - 完整内容
   * @returns {ReadableStream} 模拟的响应流
   */
  simulateStream(content) {
    const chunks = content.split(' ');
    let index = 0;

    return new ReadableStream({
      start(controller) {
        const sendNextChunk = () => {
          if (index < chunks.length) {
            const chunk = {
              content: chunks[index] + ' ',
              role: 'assistant',
              finish_reason: null,
            };
            controller.enqueue(`data: ${JSON.stringify({ choices: [{ delta: chunk }] })}\\n\\n`);
            index++;
            setTimeout(sendNextChunk, 50); // 模拟延迟
          } else {
            controller.enqueue('data: [DONE]\\n\\n');
            controller.close();
          }
        };
        sendNextChunk();
      }
    });
  }

  /**
   * 非流式响应处理
   * @param {Object} requestBody - 请求体
   * @returns {Promise<Object>} 响应对象
   */
  async completeMessage(requestBody) {
    try {
      const url = `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await this.makeRequest(url, requestBody);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Gemini API error');
      }

      return this.formatResponse(data);
    } catch (error) {
      logger.error('Gemini completion error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 发起HTTP请求
   * @param {string} url - 请求URL
   * @param {Object} requestBody - 请求体
   * @param {number} retryCount - 重试次数
   * @returns {Promise<Response>} HTTP响应
   */
  async makeRequest(url, requestBody, retryCount = 0) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        timeout: 30000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        logger.warn(`Gemini request failed, retrying... (${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(this.retryDelay * (retryCount + 1));
        return this.makeRequest(url, requestBody, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * 格式化输入消息为Gemini格式
   * @param {Array} messages - 原始消息数组
   * @returns {Array} 格式化后的消息数组
   */
  formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: this.sanitizeContent(msg.content || '') }],
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
    
    return content
      .replace(/[\x00-\x1f\x7f]/g, '')
      .trim()
      .slice(0, 4000);
  }

  /**
   * 格式化最终响应为OpenAI兼容格式
   * @param {Object} data - 原始响应数据
   * @returns {Object} 格式化后的响应
   */
  formatResponse(data) {
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Invalid response format from Gemini API');
    }

    const candidate = data.candidates[0];
    const content = candidate.content.parts[0].text || '';

    return {
      id: uuidv4(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: content,
        },
        finish_reason: candidate.finishReason === 'STOP' ? 'stop' : candidate.finishReason?.toLowerCase(),
      }],
      usage: data.usageMetadata ? {
        prompt_tokens: data.usageMetadata.promptTokenCount || 0,
        completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata.totalTokenCount || 0,
      } : {
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
    logger.error('Gemini Client Error:', error);

    if (error.message.includes('ECONNREFUSED')) {
      return new Error('Unable to connect to Gemini service. Please check your internet connection.');
    }

    if (error.message.includes('401') || error.message.includes('403')) {
      return new Error('Invalid Gemini API key. Please check your credentials.');
    }

    if (error.message.includes('429')) {
      return new Error('Gemini API rate limit exceeded. Please try again later.');
    }

    if (error.message.includes('timeout')) {
      return new Error('Gemini API request timeout. Please try again.');
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
        id: 'gemini-pro',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'google',
        permission: [],
        root: 'gemini-pro',
        parent: null,
      },
      {
        id: 'gemini-1.5-pro',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'google',
        permission: [],
        root: 'gemini-1.5-pro',
        parent: null,
      },
    ];
  }
}

module.exports = GeminiClient;