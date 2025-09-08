const express = require('express');
const router = express.Router();
// const { logger } = require('@librechat/data-schemas');
const { GeminiClient } = require('~/app/clients');
// const {
//   getConvoTitle,
//   getResponseSender,
//   saveMessage,
//   saveConvo,
// } = require('~/models');

// 临时logger替代
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};

// 临时模型函数替代
const saveMessage = async (message) => {
  logger.info('Saving message:', message.text?.substring(0, 100) + '...');
  return Promise.resolve();
};

const getConvo = async (userId, conversationId) => {
  logger.info(`Getting conversation ${conversationId} for user ${userId}`);
  return Promise.resolve(null);
};

/**
 * Gemini 对话路由处理器
 */
router.post('/', async (req, res) => {
  try {
    const {
      conversationId,
      parentMessageId,
      message,
      model = 'gemini-pro',
      temperature = 0.7,
      max_tokens = 2048,
      stream = true,
    } = req.body;

    // 临时用户对象（用于测试）
    const user = req.user || { id: 'test-user', username: 'testuser', email: 'test@example.com' };
    
    if (!message || !message.content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    logger.info(`Gemini request from user ${user.id}: ${message.content.substring(0, 100)}...`);

    // 初始化Gemini客户端
    const geminiClient = new GeminiClient({
      apiKey: process.env.GEMINI_API_KEY,
      model: model,
    });

    // 获取对话历史
    let conversation = null;
    if (conversationId) {
      try {
        conversation = await getConvo(user.id, conversationId);
      } catch (error) {
        logger.warn(`Failed to load conversation ${conversationId}:`, error);
      }
    }

    // 构建消息历史
    const messages = [];
    if (conversation && conversation.messages) {
      // 添加历史消息（限制数量以控制token使用）
      const recentMessages = conversation.messages.slice(-10);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.isCreatedByUser ? 'user' : 'assistant',
          content: msg.text,
        });
      }
    }

    // 添加当前用户消息
    messages.push({
      role: 'user',
      content: message.content,
    });

    // 保存用户消息
    const userMessage = {
      messageId: message.messageId || require('uuid').v4(),
      conversationId: conversationId || require('uuid').v4(),
      parentMessageId: parentMessageId,
      sender: user.username || user.email,
      text: message.content,
      isCreatedByUser: true,
      userId: user.id,
    };

    await saveMessage(userMessage);

    // 构建API请求
    const payload = {
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: max_tokens,
      stream: stream,
    };

    if (stream) {
      // 流式响应
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      });

      let assistantMessage = '';
      const messageId = require('uuid').v4();

      try {
        const stream = await geminiClient.sendMessage(payload, { stream: true });
        
        // 处理流式响应
        const reader = stream.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                res.write(`data: [DONE]\n\n`);
                res.end();
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                  const content = parsed.choices[0].delta.content;
                  if (content) {
                    assistantMessage += content;
                  }
                }
                res.write(`data: ${data}\n\n`);
              } catch (error) {
                logger.warn('Failed to parse stream chunk:', data);
              }
            }
          }
        }

        // 保存助手回复
        const assistantResponse = {
          messageId: messageId,
          conversationId: userMessage.conversationId,
          parentMessageId: userMessage.messageId,
          sender: 'Gemini',
          text: assistantMessage,
          isCreatedByUser: false,
          model: model,
          userId: user.id,
        };

        await saveMessage(assistantResponse);

      } catch (error) {
        logger.error('Gemini streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }

    } else {
      // 非流式响应
      try {
        const response = await geminiClient.sendMessage(payload, { stream: false });
        
        if (!response.choices || !response.choices[0]) {
          throw new Error('Invalid response from Gemini API');
        }

        const assistantMessage = response.choices[0].message.content;
        const messageId = require('uuid').v4();

        // 保存助手回复
        const assistantResponse = {
          messageId: messageId,
          conversationId: userMessage.conversationId,
          parentMessageId: userMessage.messageId,
          sender: 'Gemini',
          text: assistantMessage,
          isCreatedByUser: false,
          model: model,
          userId: user.id,
        };

        await saveMessage(assistantResponse);

        res.json({
          message: {
            id: messageId,
            conversationId: userMessage.conversationId,
            parentMessageId: userMessage.messageId,
            role: 'assistant',
            content: assistantMessage,
            model: model,
            finish_reason: response.choices[0].finish_reason,
          },
          usage: response.usage,
        });

      } catch (error) {
        logger.error('Gemini completion error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }

  } catch (error) {
    logger.error('Gemini route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 获取Gemini支持的模型列表
 */
router.get('/models', async (req, res) => {
  try {
    const geminiClient = new GeminiClient();
    const models = geminiClient.getModels();
    
    res.json({
      object: 'list',
      data: models,
    });
  } catch (error) {
    logger.error('Failed to get Gemini models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

module.exports = router;