import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Users,
  Check,
  CheckCheck,
  MessageCircle
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { formatDateTime, formatMessageDate } from '../../utils/timeUtils';

export function ChatWindow() {
  const {
    user,
    currentChat,
    messages,
    sendMessage,
    typingStart,
    typingStop,
    typingUsers,
    onlineUsers
  } = useChat();

  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number | undefined>(undefined);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 获取聊天参与者信息
  const getChatInfo = () => {
    if (!currentChat || !user) return null;

    if (currentChat.type === 'group') {
      return {
        name: currentChat.name || '未命名群组',
        avatar: currentChat.avatar || 'https://ui-avatars.com/api/?name=Group&background=random',
        status: `${currentChat.participants.length} 位成员`,
        isGroup: true
      };
    } else {
      // 对于私聊，找到另一个参与者
      const otherParticipantId = currentChat.participants.find(id => id !== user.id);
      const otherUser = onlineUsers.find(u => u.id === otherParticipantId);

      return {
        name: otherUser?.displayName || '未知用户',
        avatar: otherUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=random',
        status: otherUser?.status === 'online' ? '在线' :
                otherUser?.status === 'away' ? '离开' : '离线',
        isGroup: false,
        isOnline: otherUser?.status === 'online'
      };
    }
  };

  const chatInfo = getChatInfo();

  // 获取当前聊天的正在输入用户
  const currentTypingUsers = typingUsers.filter(
    typingUser => typingUser.chatId === currentChat?.id && typingUser.userId !== user?.id
  );

  // 处理消息输入
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);

    // 处理输入指示器
    if (currentChat) {
      if (!typingTimeoutRef.current) {
        typingStart(currentChat.id);
      }

      // 清除现有超时
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // 设置新超时，1秒无活动后停止输入
      typingTimeoutRef.current = window.setTimeout(() => {
        typingStop(currentChat.id);
        typingTimeoutRef.current = undefined;
      }, 1000);
    }
  };

  // 处理发送消息
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (messageInput.trim() && currentChat) {
      sendMessage(currentChat.id, messageInput.trim());
      setMessageInput('');

      // 清除输入超时
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      typingStop(currentChat.id);
    }
  };

  // 处理表情选择
  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // 检查消息是否为当前用户发送
  const isOwnMessage = (message: any) => message.senderId === user?.id;

  // 获取消息状态
  const getMessageStatus = (message: any) => {
    if (!isOwnMessage(message)) return null;

    if (message.readBy && message.readBy.length > 1) {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else {
      return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  // 按日期分组消息
  const groupMessagesByDate = (messages: any[]) => {
    const groups: { [date: string]: any[] } = {};

    messages.forEach(message => {
      const date = formatMessageDate(new Date(message.timestamp));
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  // 常用表情
  const commonEmojis = ['😀', '😊', '😍', '🤣', '😭', '😡', '👍', '👎', '❤️', '💔', '🎉', '🔥', '✨', '💯', '🙏'];

  if (!currentChat || !chatInfo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <MessageCircle className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">欢迎使用聊天</h3>
          <p className="text-gray-600">选择一个对话开始聊天</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 聊天头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="avatar">
                <img
                  src={chatInfo.avatar}
                  alt={chatInfo.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = chatInfo.name.charAt(0).toUpperCase();
                  }}
                />
              </div>
              {!chatInfo.isGroup && chatInfo.isOnline && (
                <div className="status-indicator status-online" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{chatInfo.name}</h3>
              <p className="text-sm text-gray-600">{chatInfo.status}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!chatInfo.isGroup && (
              <>
                <button className="btn-ghost tooltip" data-tooltip="语音通话">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="btn-ghost tooltip" data-tooltip="视频通话">
                  <Video className="w-5 h-5" />
                </button>
              </>
            )}
            {chatInfo.isGroup && (
              <button className="btn-ghost tooltip" data-tooltip="群组信息">
                <Users className="w-5 h-5" />
              </button>
            )}
            <button className="btn-ghost tooltip" data-tooltip="更多选项">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            {/* 日期分隔符 */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-gray-200 px-3 py-1 rounded-full">
                <span className="text-xs text-gray-600">{date}</span>
              </div>
            </div>

            {/* 该日期的消息 */}
            <div className="space-y-2">
              {dateMessages.map((message) => {
                const isOwn = isOwnMessage(message);
                const showStatus = isOwn && message.type !== 'system';

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} message-enter`}
                  >
                    {message.type === 'system' ? (
                      <div className="text-center">
                        <span className="text-xs text-gray-500 italic bg-gray-100 px-3 py-1 rounded-full">
                          {message.content}
                        </span>
                      </div>
                    ) : (
                      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwn
                              ? 'message-bubble-sent'
                              : 'message-bubble-received'
                          }`}
                        >
                          <p className="text-sm break-words">{message.content}</p>
                        </div>
                        <div className={`flex items-center gap-1 mt-1 px-1 ${
                          isOwn ? 'justify-end' : 'justify-start'
                        }`}>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(new Date(message.timestamp))}
                          </span>
                          {showStatus && getMessageStatus(message)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* 输入指示器 */}
        {currentTypingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 消息输入 */}
      <div className="bg-white border-t border-gray-200 p-4">
        {/* 表情选择器 */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 card p-3 shadow-lg">
            <div className="grid grid-cols-5 gap-2">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <button
            type="button"
            className="btn-ghost tooltip"
            data-tooltip="发送文件"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={handleInputChange}
              placeholder="输入消息..."
              className="input-field resize-none w-full min-h-[40px] max-h-32 py-2"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="btn-ghost tooltip"
            data-tooltip="表情"
          >
            <Smile className="w-5 h-5" />
          </button>

          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="btn-primary"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}