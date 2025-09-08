const express = require('express');
const router = express.Router();
const { logger } = require('@librechat/data-schemas');
const { ChatGLMClient } = require('~/app/clients');
const {
  getConvoTitle,
  getResponseSender,
  saveMessage,
  saveConvo,
} = require('~/models');

/**
 * ChatGLM 对话路由处理器
 */
router.post('/', async (req, res) => {
  try {
    const {
      conversationId,
      parentMessageId,
      message,
      model = 'chatglm-6b',
      temperature = 0.7,
      max_tokens = 2048,
      stream = true,
    } = req.body;

    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!message || !message.content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    logger.info(`ChatGLM request from user ${user.id}: ${message.content.substring(0, 100)}...`);

    // 初始化ChatGLM客户端
    const chatglmClient = new ChatGLMClient({
      apiKey: process.env.CHATGLM_API_KEY,
      baseURL: process.env.CHATGLM_ENDPOINT,
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
        const stream = await chatglmClient.sendMessage(payload, { stream: true });
        
        for await (const chunk of stream) {
          if (chunk && chunk.content) {
            assistantMessage += chunk.content;
            
            // 发送流式数据到客户端
            const streamData = {
              id: messageId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: model,
              choices: [{
                index: 0,
                delta: { content: chunk.content },
                finish_reason: chunk.finish_reason,
              }],
            };
            
            res.write(`data: ${JSON.stringify(streamData)}\n\n`);
          }
          
          if (chunk && chunk.finish_reason) {
            break;
          }
        }

        // 保存助手回复
        const assistantResponse = {
          messageId: messageId,
          conversationId: userMessage.conversationId,
          parentMessageId: userMessage.messageId,
          sender: 'ChatGLM',
          text: assistantMessage,
          isCreatedByUser: false,
          model: model,
          userId: user.id,
        };

        await saveMessage(assistantResponse);

        // 结束流
        res.write(`data: [DONE]\n\n`);
        res.end();

      } catch (error) {
        logger.error('ChatGLM streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }

    } else {
      // 非流式响应
      try {
        const response = await chatglmClient.sendMessage(payload, { stream: false });
        
        if (!response.choices || !response.choices[0]) {
          throw new Error('Invalid response from ChatGLM API');
        }

        const assistantMessage = response.choices[0].message.content;
        const messageId = require('uuid').v4();

        // 保存助手回复
        const assistantResponse = {
          messageId: messageId,
          conversationId: userMessage.conversationId,
          parentMessageId: userMessage.messageId,
          sender: 'ChatGLM',
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
        logger.error('ChatGLM completion error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }

  } catch (error) {
    logger.error('ChatGLM route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 获取ChatGLM支持的模型列表
 */
router.get('/models', async (req, res) => {
  try {
    const chatglmClient = new ChatGLMClient();
    const models = chatglmClient.getModels();
    
    res.json({
      object: 'list',
      data: models,
    });
  } catch (error) {
    logger.error('Failed to get ChatGLM models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

module.exports = router;