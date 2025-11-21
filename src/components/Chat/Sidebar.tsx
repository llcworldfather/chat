import React, { useState, useMemo } from 'react';
import {
    Search,
    Users,
    MessageCircle,
    LogOut
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { formatTime } from '../../utils/timeUtils';

export function Sidebar() {
    const {
        user,
        chats,
        currentChat,
        onlineUsers,
        setCurrentChat,
        logout,
        getUserInfo // [新增] 使用 Context 里的方法
    } = useChat();

    const [searchQuery, setSearchQuery] = useState('');
    const [showUserList, setShowUserList] = useState(false);

    const getChatDisplayInfo = (chat: any) => {
        if (chat.type === 'group') {
            return {
                name: chat.name || '未命名群组',
                avatar: chat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || 'Group')}&background=random`,
                lastMessage: chat.lastMessage?.content || '',
                isOnline: false,
                unreadCount: chat.unreadCounts?.get(user?.id || '') || 0
            };
        } else {
            const otherParticipantId = chat.participants.find((id: string) => id !== user?.id);
            // [修改] 使用全局方法获取用户信息
            const otherUser = otherParticipantId ? getUserInfo(otherParticipantId) : null;
            const displayName = otherUser ? (otherUser.displayName || otherUser.username) : '未知用户';
            const avatar = otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent('User')}&background=random`;
            const isOnline = onlineUsers.some(u => u.id === otherParticipantId);

            return {
                name: displayName,
                avatar,
                lastMessage: chat.lastMessage?.content || '',
                isOnline,
                unreadCount: chat.unreadCounts?.get(user?.id || '') || 0
            };
        }
    };

    // 过滤逻辑也需要更新
    const filteredChats = useMemo(() => {
        if (!searchQuery) return chats;

        return chats.filter(chat => {
            if (chat.type === 'group') {
                return chat.name?.toLowerCase().includes(searchQuery.toLowerCase());
            } else {
                const otherParticipantId = chat.participants.find((id: string) => id !== user?.id);
                const otherUser = otherParticipantId ? getUserInfo(otherParticipantId) : null;
                const name = otherUser ? (otherUser.displayName || otherUser.username) : '';
                return name.toLowerCase().includes(searchQuery.toLowerCase());
            }
        });
    }, [chats, searchQuery, user?.id, getUserInfo]);

    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
            {/* 头部保持不变 */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="avatar">
                                {user?.displayName?.charAt(0)?.toUpperCase()}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{user?.displayName}</h3>
                            <p className="text-sm text-gray-600">@{user?.username}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowUserList(!showUserList)}
                            className="btn-ghost tooltip"
                            data-tooltip={`在线用户 (${onlineUsers.length})`}
                        >
                            <Users className="w-5 h-5" />
                            {onlineUsers.length > 0 && (
                                <span className="badge absolute -top-1 -right-1 min-w-[16px] h-4 text-xs">
                  {onlineUsers.length}
                </span>
                            )}
                        </button>
                        <button
                            onClick={logout}
                            className="btn-ghost tooltip"
                            data-tooltip="退出登录"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="搜索对话..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10 text-sm"
                    />
                </div>
            </div>

            {/* 聊天列表 */}
            <div className="flex-1 overflow-y-auto">
                {filteredChats.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">
                            {searchQuery ? '没有找到匹配的对话' : '还没有对话'}
                        </p>
                        {!searchQuery && (
                            <button className="btn-primary mt-3 text-sm">
                                开始新对话
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="p-2">
                        {filteredChats.map((chat) => {
                            const chatInfo = getChatDisplayInfo(chat);
                            const isActive = currentChat?.id === chat.id;

                            return (
                                <button
                                    key={chat.id}
                                    onClick={() => setCurrentChat(chat)}
                                    className={`w-full p-3 rounded-lg transition-all text-left ${
                                        isActive
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="relative flex-shrink-0">
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
                                            {chatInfo.isOnline && (
                                                <div className="status-indicator status-online" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-medium text-gray-900 truncate">
                                                    {chatInfo.name}
                                                </h4>
                                                {/* [新增] 未读红点 */}
                                                {chatInfo.unreadCount > 0 ? (
                                                    <div style={{
                                                        background: '#ff5f57',
                                                        color: 'white',
                                                        fontSize: 10,
                                                        fontWeight: 'bold',
                                                        minWidth: 16,
                                                        height: 16,
                                                        borderRadius: 8,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '0 4px'
                                                    }}>
                                                        {chatInfo.unreadCount > 99 ? '99+' : chatInfo.unreadCount}
                                                    </div>
                                                ) : (
                                                    chat.lastMessage && (
                                                        <span className="text-xs text-gray-500 ml-2">
                                {formatTime(new Date(chat.lastMessage.timestamp))}
                              </span>
                                                    )
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-gray-600 truncate">
                                                    {chatInfo.lastMessage || '暂无消息'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 在线用户列表 */}
            {showUserList && (
                <div className="absolute bottom-0 left-0 right-0 bg-white border border-gray-200 rounded-t-lg shadow-lg p-4 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">在线用户</h4>
                        <button onClick={() => setShowUserList(false)} className="text-gray-400 hover:text-gray-600">×</button>
                    </div>
                    <div className="space-y-2">
                        {onlineUsers
                            .filter(u => u.id !== user?.id)
                            .map((onlineUser) => (
                                <button
                                    key={onlineUser.id}
                                    onClick={() => {
                                        const existingChat = chats.find(chat =>
                                            chat.type === 'private' &&
                                            chat.participants.includes(onlineUser.id) &&
                                            chat.participants.includes(user?.id || '')
                                        );
                                        if (existingChat) {
                                            setCurrentChat(existingChat);
                                        } else {
                                            // TODO: 处理新私聊
                                        }
                                        setShowUserList(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="relative">
                                        <div className="avatar avatar-sm">
                                            <img
                                                src={onlineUser.avatar}
                                                alt={onlineUser.displayName}
                                                className="w-full h-full object-cover rounded-full"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    target.parentElement!.innerHTML = onlineUser.displayName.charAt(0).toUpperCase();
                                                }}
                                            />
                                        </div>
                                        <div className={`status-indicator status-${onlineUser.status}`} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-medium text-gray-900 text-sm">{onlineUser.displayName}</p>
                                        <p className="text-xs text-gray-600">在线</p>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}