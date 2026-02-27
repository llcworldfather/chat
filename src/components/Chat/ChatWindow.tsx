import React, { useState, useRef, useEffect } from 'react';
import {
    Send,
    Smile,
    Paperclip,
    MoreVertical,
    Phone,
    Video,
    Users,
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
        onlineUsers,
        getUserInfo
    } = useChat();

    const [messageInput, setMessageInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]); // typingUsers 变化时也滚动

    // 获取当前聊天的显示信息（头像、标题等）
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
            const otherParticipantId = currentChat.participants.find(id => id !== user.id);
            const otherUser = otherParticipantId ? getUserInfo(otherParticipantId) : null;

            const displayName = otherUser ? (otherUser.displayName || otherUser.username) : '未知用户';
            const avatar = otherUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=random';
            const isOnline = onlineUsers.some(u => u.id === otherParticipantId);

            return {
                name: displayName,
                avatar,
                status: isOnline ? '在线' : '离线',
                isGroup: false,
                isOnline
            };
        }
    };

    const chatInfo = getChatInfo();
    const currentTypingUsers = typingUsers.filter(
        typingUser => typingUser.chatId === currentChat?.id && typingUser.userId !== user?.id
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessageInput(e.target.value);
        if (currentChat) {
            if (!typingTimeoutRef.current) { typingStart(currentChat.id); }
            if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); }
            typingTimeoutRef.current = window.setTimeout(() => {
                typingStop(currentChat.id);
                typingTimeoutRef.current = undefined;
            }, 1000);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (messageInput.trim() && currentChat) {
            sendMessage(currentChat.id, messageInput.trim());
            setMessageInput('');
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = undefined;
            }
            typingStop(currentChat.id);
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        setMessageInput(prev => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const isOwnMessage = (message: any) => message.senderId === user?.id;

    const groupMessagesByDate = (messages: any[]) => {
        const groups: { [date: string]: any[] } = {};
        messages.forEach(message => {
            const date = formatMessageDate(new Date(message.timestamp));
            if (!groups[date]) { groups[date] = []; }
            groups[date].push(message);
        });
        return groups;
    };

    const messageGroups = groupMessagesByDate(messages);
    const commonEmojis = ['😀', '😊', '😍', '🤣', '😭', '😡', '👍', '👎', '❤️', '💔', '🎉', '🔥', '✨', '💯', '🙏'];

    if (!currentChat || !chatInfo) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{background: 'rgba(255,255,255,0.3)'}}>
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
        <div className="flex-1 flex flex-col relative">
            {/* Header */}
            <div className="chat-header">
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
                        {!chatInfo.isGroup && chatInfo.isOnline && ( <div className="status-indicator status-online" /> )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{chatInfo.name}</h3>
                        <p className="text-sm text-gray-600">{chatInfo.status}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!chatInfo.isGroup && (
                        <>
                            <button className="btn-ghost tooltip" data-tooltip="语音通话"><Phone className="w-5 h-5" /></button>
                            <button className="btn-ghost tooltip" data-tooltip="视频通话"><Video className="w-5 h-5" /></button>
                        </>
                    )}
                    {chatInfo.isGroup && (<button className="btn-ghost tooltip" data-tooltip="群组信息"><Users className="w-5 h-5" /></button>)}
                    <button className="btn-ghost tooltip" data-tooltip="更多选项"><MoreVertical className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="chat-messages" id="messageArea">
                {Object.entries(messageGroups).map(([date, dateMessages]) => (
                    <React.Fragment key={date}>
                        <div className="flex items-center justify-center my-2">
                            <div className="bg-gray-200/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                <span className="text-xs text-gray-600 font-medium">{date}</span>
                            </div>
                        </div>

                        {dateMessages.map((message) => {
                            const isOwn = isOwnMessage(message);

                            // 获取当前消息发送者的头像
                            let senderAvatar = chatInfo.avatar; // 默认对方
                            let senderName = chatInfo.name;

                            if (isOwn) {
                                senderAvatar = user?.avatar || '';
                                senderName = user?.displayName || 'Me';
                            } else if (currentChat.type === 'group') {
                                // 群组里获取具体发送者信息
                                const sender = getUserInfo(message.senderId);
                                if (sender) {
                                    senderAvatar = sender.avatar || '';
                                    senderName = sender.displayName;
                                }
                            }

                            return (
                                <div key={message.id} className={`message ${isOwn ? 'sent' : ''}`}>
                                    {message.type === 'system' ? (
                                        <div className="w-full text-center my-2">
                                            <span className="text-xs text-gray-500 italic bg-gray-100 px-3 py-1 rounded-full">
                                                {message.content}
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* 头像：自己和对方都显示 */}
                                            <div className="message-avatar" title={senderName}>
                                                <img
                                                    src={senderAvatar}
                                                    alt={senderName}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.parentElement!.innerText = senderName.charAt(0).toUpperCase();
                                                    }}
                                                />
                                            </div>

                                            {/* 消息内容气泡 */}
                                            <div className="message-content">
                                                {/* 群组中在对方消息上方显示名字 */}
                                                {currentChat.type === 'group' && !isOwn && (
                                                    <div className="text-xs font-bold text-gray-500 mb-1 opacity-80">
                                                        {senderName}
                                                    </div>
                                                )}

                                <p style={{ wordBreak: 'break-word' }}>
                                    {message.content}
                                    {message.isStreaming && (
                                        <span
                                            className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
                                            style={{ animation: 'blink 0.8s step-start infinite' }}
                                        />
                                    )}
                                </p>

                                <span className="message-time">
                                    {message.isStreaming ? '正在输入…' : formatDateTime(new Date(message.timestamp))}
                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}

                {/* 输入指示器 */}
                {currentTypingUsers.length > 0 && (
                    <div className="message">
                        <div className="message-avatar">
                            <div className="animate-pulse">...</div>
                        </div>
                        <div className="message-content flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="chat-input-container">
                {showEmojiPicker && (
                    <div className="absolute bottom-20 left-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-gray-200 z-50">
                        <div className="grid grid-cols-5 gap-2">
                            {commonEmojis.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => handleEmojiSelect(emoji)}
                                    className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-transform hover:scale-110"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button type="button" className="p-2 text-gray-500 hover:text-blue-500 transition-colors">
                    <Paperclip className="w-6 h-6" />
                </button>

                <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={handleInputChange}
                    placeholder="说点什么..."
                    className="chat-input flex-1 resize-none min-h-[44px] max-h-32"
                    rows={1}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                        }
                    }}
                />

                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-500 hover:text-yellow-500 transition-colors"
                >
                    <Smile className="w-6 h-6" />
                </button>

                <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="send-btn disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    <Send className="w-5 h-5 ml-0.5" />
                </button>
            </div>
        </div>
    );
}