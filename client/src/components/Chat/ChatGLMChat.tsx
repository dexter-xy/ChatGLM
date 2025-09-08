import React, { useState, useRef, useEffect } from 'react';
import { useLocalize } from '~/hooks';
import { ChatGLMModelSelector } from '../Chat/Menus/Endpoints';
import { MessageInput } from '../Chat/Input';
import { MessagesContainer } from '../Messages';

/**
 * ChatGLM专用主聊天界面
 * 简化的聊天界面，专门用于ChatGLM对话
 */
export default function ChatGLMChat() {
  const localize = useLocalize();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 默认欢迎消息
  const welcomeMessage = {
    id: 'welcome',
    role: 'assistant',
    content: localize('chatglm_welcome_message'),
    timestamp: new Date().toISOString(),
  };

  // 初始化时添加欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([welcomeMessage]);
    }
  }, [localize]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息处理
  const handleSendMessage = async (content) => {
    if (!content.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // 这里将调用ChatGLM API
      // 暂时使用模拟响应
      const response = await simulateChatGLMResponse(content);
      
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('ChatGLM API Error:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: localize('chatglm_connection_error'),
        timestamp: new Date().toISOString(),
        error: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 模拟ChatGLM响应（实际使用时会替换为真实API调用）
  const simulateChatGLMResponse = async (input) => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // 简单的回复示例
    const responses = [
      `我理解您的问题"${input.substring(0, 20)}..."，让我来为您详细解答。`,
      `关于"${input.substring(0, 20)}..."这个问题，我可以从多个角度为您分析。`,
      `您提到的"${input.substring(0, 20)}..."是一个很有趣的话题，我来为您详细说明。`,
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  return (
    <div className="flex h-full flex-col bg-background-primary">
      {/* 头部区域 - ChatGLM模型选择器 */}
      <div className="flex flex-col items-center justify-center border-b border-border-light bg-surface-primary p-4">
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-text-primary">
            {localize('chatglm_welcome_title')}
          </h1>
        </div>
        <ChatGLMModelSelector />
      </div>

      {/* 消息容器 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-6 flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.error
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-surface-secondary text-text-primary'
                  }`}
                >
                  {/* 消息头部 */}
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium opacity-70">
                      {message.role === 'user' ? localize('com_user_message') : 'ChatGLM'}
                    </span>
                    <span className="text-xs opacity-50">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {/* 消息内容 */}
                  <div className="whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}

            {/* 加载指示器 */}
            {isLoading && (
              <div className="mb-6 flex justify-start">
                <div className="max-w-[80%] rounded-lg bg-surface-secondary px-4 py-2 text-text-primary">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium opacity-70">ChatGLM</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce"></div>
                      <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm text-text-secondary">
                      {localize('chatglm_thinking')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t border-border-light bg-surface-primary p-4">
        <div className="mx-auto max-w-4xl">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder={localize('com_ui_enter_message') || '输入消息...'}
          />
        </div>
      </div>
    </div>
  );
}