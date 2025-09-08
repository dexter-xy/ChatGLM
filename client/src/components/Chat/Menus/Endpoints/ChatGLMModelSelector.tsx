import React from 'react';
import { useLocalize } from '~/hooks';

/**
 * ChatGLM专用模型选择器
 * 简化的界面，固定显示ChatGLM模型信息
 */
export default function ChatGLMModelSelector() {
  const localize = useLocalize();

  // ChatGLM模型信息
  const chatglmInfo = {
    name: 'ChatGLM',
    model: 'chatglm-6b',
    displayName: 'ChatGLM-6B',
    description: localize('chatglm_model_description') || '智能对话大语言模型',
    icon: (
      <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold">
        GLM
      </div>
    ),
  };

  return (
    <div className="relative flex w-full max-w-md flex-col items-center gap-2">
      {/* 固定的ChatGLM显示按钮 */}
      <div className="my-1 flex h-10 w-full max-w-[70vw] items-center justify-center gap-2 rounded-xl border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-primary">
        {/* ChatGLM图标 */}
        <div className="flex flex-shrink-0 items-center justify-center overflow-hidden">
          {chatglmInfo.icon}
        </div>
        
        {/* 模型名称和描述 */}
        <div className="flex flex-col flex-grow text-left">
          <span className="font-medium truncate">{chatglmInfo.displayName}</span>
          <span className="text-xs text-text-secondary truncate">{chatglmInfo.description}</span>
        </div>
        
        {/* 在线状态指示器 */}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title={localize('chatglm_online') || '在线'} />
          <span className="text-xs text-text-secondary">{localize('chatglm_ready') || '准备就绪'}</span>
        </div>
      </div>

      {/* 模型信息卡片（可选显示） */}
      <div className="w-full text-center">
        <div className="text-xs text-text-secondary">
          {localize('chatglm_powered_by') || '由 ChatGLM 大语言模型驱动'}
        </div>
      </div>
    </div>
  );
}