import React from 'react';
import { useChat } from '../../context/ChatContext';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { Wifi, WifiOff } from 'lucide-react';

export function ChatContainer() {
  const { user, isConnected } = useChat();

  if (!user) {
    return null; // Will be handled by AuthContainer
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Connection Status Indicator */}
      <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg ${
        isConnected
          ? 'bg-green-50 border border-green-200 text-green-600'
          : 'bg-red-50 border border-red-200 text-red-600'
      }`}>
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">已连接</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">连接断开</span>
          </>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Chat Area */}
      <ChatWindow />
    </div>
  );
}