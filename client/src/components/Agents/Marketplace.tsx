import React from 'react';

const AgentMarketplace: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-96 p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">
          Agent Marketplace (功能已简化)
        </h2>
        <p className="text-gray-500 mb-6">
          此功能已在ChatGLM专用版本中移除，专注于对话体验。
        </p>
        <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
          请使用左侧导航返回到聊天界面
        </div>
      </div>
    </div>
  );
};

export default AgentMarketplace;