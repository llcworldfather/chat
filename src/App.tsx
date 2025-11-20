import React, { useState, useEffect, useRef } from 'react';
import { Send, ChevronLeft, LogOut, Search, UserPlus, X } from 'lucide-react';
import { useChat } from './context/ChatContext';
import { socketService } from './services/socket';
import './index.css';

function App() {
    // --- Chat Context ---
    const {
        user,
        login,
        register,
        logout,
        chats,
        currentChat,
        messages,
        setCurrentChat,
        sendMessage,
        addFriend,
        onlineUsers,
        loading,
        error
    } = useChat();

    // --- 认证状态 ---
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

    // --- UI 状态 ---
    const [inputText, setInputText] = useState('');
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newContactName, setNewContactName] = useState('');

    // --- 用户信息缓存 (关键修复：用于存储离线但已建立关系的用户的详细信息) ---
    const [userCache, setUserCache] = useState<Map<string, any>>(new Map());

    // --- 认证表单状态 ---
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentChat]);

    // --- [核心修复 1] 监听 Socket 事件并立即更新缓存 ---
    // 只要收到加好友成功的消息（无论是主动发起的还是被动接收的），都立刻把对方信息存入缓存
    useEffect(() => {
        const handleFriendAdded = (data: any) => {
            console.log("收到 friend_added 事件:", data);
            // 兼容不同的返回结构，socket.ts 定义的是 { chat, friend, systemMessage }
            const friendData = data.friend || data;

            if (friendData && friendData.id) {
                setUserCache(prev => {
                    const newCache = new Map(prev);
                    newCache.set(friendData.id, friendData);
                    console.log(`更新缓存: ${friendData.username} (${friendData.id})`);
                    return newCache;
                });
            }
        };

        // 监听socket事件
        socketService.onFriendAdded(handleFriendAdded);

        // 清理监听器
        return () => {
            // 注意：这里需要 SocketService 有对应的 off 方法，或者直接忽略清理以防止引用问题
            // socketService.off('friend_added', handleFriendAdded);
        };
    }, []);

    const handleLogin = async () => {
        if (!username || !password) {
            return;
        }
        await login(username, password);
    };

    const handleRegister = async () => {
        if (!username || !email || !password) {
            return;
        }
        await register({ username, displayName: username, password, email });
    };

    const handleLogout = () => {
        logout();
        setAuthMode('login');
        setMobileShowChat(false);
        setUserCache(new Map()); // 登出清空缓存
    };

    // --- [核心修复 2] 获取用户显示名称逻辑优化 ---
    const getUserDisplayName = (userId: string): string => {
        // 1. 如果是自己
        if (user?.id === userId) {
            return user.displayName || user.username;
        }

        // 2. 从在线用户中查找（数据最新）
        const onlineUser = onlineUsers.find(u => u.id === userId);
        if (onlineUser) {
            return onlineUser.displayName || onlineUser.username;
        }

        // 3. 从本地缓存中查找（修复加好友后名字乱码的关键）
        const cachedUser = userCache.get(userId);
        if (cachedUser) {
            return cachedUser.displayName || cachedUser.username;
        }

        // 4. 实在找不到，暂时显示 ID（避免空）
        return `User ${userId.slice(0, 6)}`;
    };

    // --- [核心修复 3] 添加好友逻辑优化 ---
    const handleAddContact = async () => {
        const nameToAdd = newContactName.trim();
        if (!nameToAdd) return;

        // 校验 1: 禁止添加自己
        if (user?.username === nameToAdd) {
            alert("不能添加自己为好友");
            return;
        }

        // 校验 2: 检查是否已经是好友
        // 我们遍历当前的聊天列表，尝试解析每个私聊对象的对方名字
        const isAlreadyFriend = chats.some(chat => {
            if (chat.type === 'private') {
                const otherUserId = chat.participants.find(id => id !== user?.id);
                if (otherUserId) {
                    // 尝试获取这个 ID 对应的名字
                    const nameFromCache = userCache.get(otherUserId)?.username;
                    const nameFromOnline = onlineUsers.find(u => u.id === otherUserId)?.username;

                    // 如果找到了名字，并且名字和输入的一样，那就是重复了
                    if ((nameFromCache === nameToAdd) || (nameFromOnline === nameToAdd)) {
                        return true;
                    }
                }
            }
            return false;
        });

        if (isAlreadyFriend) {
            alert(`用户 ${nameToAdd} 已经是您的好友了`);
            return;
        }

        try {
            // 发送请求
            // 使用双重断言绕过 TS 类型检查，确保获取返回值
            const result = (await socketService.addFriend(nameToAdd)) as unknown as any;

            // 手动更新缓存（双重保险：防止 Socket 事件延迟）
            const friendData = result?.friend || result;
            if (friendData && friendData.id) {
                setUserCache(prev => {
                    const newCache = new Map(prev);
                    newCache.set(friendData.id, friendData);
                    return newCache;
                });
            }

            setNewContactName('');
            setShowAddModal(false);
        } catch (e: any) {
            console.error("添加好友失败:", e);
            alert(e.message || "添加好友失败，请检查用户名是否正确");
        }
    };

    const handleSendMessage = () => {
        if (!inputText.trim() || !currentChat) return;

        sendMessage(currentChat.id, inputText);
        setInputText('');
    };

    // 获取当前聊天的参与者信息
    const getCurrentChatInfo = () => {
        if (!currentChat) return null;

        if (currentChat.type === 'private' && currentChat.participants.length === 2) {
            // 私聊：获取对方信息
            const otherUserId = currentChat.participants.find(id => id !== user?.id);
            // 如果 otherUserId 存在，使用 getUserDisplayName 获取名字，这样能利用上 userCache
            const displayName = otherUserId ? getUserDisplayName(otherUserId) : 'Unknown User';

            return {
                name: displayName,
                avatar: displayName.slice(0, 2).toUpperCase(),
                color: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                online: otherUserId ? onlineUsers.some(u => u.id === otherUserId) : false
            };
        } else {
            // 群聊
            return {
                name: currentChat.name || 'Group Chat',
                avatar: currentChat.avatar || 'G',
                color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                online: true
            };
        }
    };

    if (!user) {
        return (
            <div className="app-wrapper">
                <div className="glass-container">
                    <div className="window-controls">
                        <div className="window-dot close"></div>
                        <div className="window-dot minimize"></div>
                        <div className="window-dot maximize"></div>
                    </div>

                    <div className="auth-layout">
                        <div className="auth-box">
                            <h2 className={`auth-title ${authMode === 'register' ? 'register-title' : ''}`}>
                                {authMode === 'login' ? 'Welcome Back' : 'Join Chat Today'}
                            </h2>
                            <p className="auth-subtitle">
                                {authMode === 'login' ? '登录账户体验清爽聊天' : '创建账户，开启精彩对话'}
                            </p>

                            {error && <div style={{color: '#ff6b6b', fontSize: 14, marginBottom: 10, textAlign: 'center'}}>{error}</div>}

                            {authMode === 'register' && (
                                <>
                                    <div className="input-group">
                                        <label>用户名</label>
                                        <input
                                            className="input-field"
                                            type="text"
                                            placeholder="选择一个用户名"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label>邮箱</label>
                                        <input
                                            className="input-field"
                                            type="email"
                                            placeholder="your@email.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label>密码</label>
                                        <input
                                            className="input-field"
                                            type="password"
                                            placeholder="至少6位字符"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            disabled={loading}
                                            onKeyDown={e => e.key === 'Enter' && handleRegister()}
                                        />
                                    </div>
                                </>
                            )}

                            {authMode === 'login' && (
                                <>
                                    <div className="input-group">
                                        <label>用户名</label>
                                        <input
                                            className="input-field"
                                            type="text"
                                            placeholder="怎么称呼您？"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label>密码</label>
                                        <input
                                            className="input-field"
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            disabled={loading}
                                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                className="primary-btn"
                                onClick={authMode === 'login' ? handleLogin : handleRegister}
                                disabled={loading}
                            >
                                {loading ? '处理中...' : (authMode === 'login' ? '立即登录' : '注册并登录')}
                            </button>

                            <p className="switch-text">
                                {authMode === 'login' ? '还没有账户？' : '已有账户？'}
                                <span className="switch-link" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); }}>
                                  {authMode === 'login' ? '立即注册' : '立即登录'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentChatInfo = getCurrentChatInfo();

    return (
        <div className="app-wrapper">
            <div className="glass-container">
                {/* 添加好友弹窗 */}
                {showAddModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#2d3748' }}>添加新朋友</h3>
                                <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
                            </div>
                            <div className="input-group">
                                <label>好友用户名</label>
                                <input
                                    className="input-field"
                                    autoFocus
                                    value={newContactName}
                                    onChange={(e) => setNewContactName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
                                    placeholder="输入用户名..."
                                />
                            </div>
                            <button className="primary-btn" onClick={handleAddContact}>确认添加</button>
                        </div>
                    </div>
                )}

                <div className="window-controls">
                    <div className="window-dot close"></div>
                    <div className="window-dot minimize"></div>
                    <div className="window-dot maximize"></div>
                </div>

                <div className="chat-layout">
                    <div className="sidebar">
                        <div className="sidebar-header">
                            <h3>Messages</h3>
                            {/* 顶部功能区：添加好友 + 退出 */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => setShowAddModal(true)} className="icon-btn" title="添加好友">
                                    <UserPlus size={20} />
                                </button>
                                <button onClick={handleLogout} className="icon-btn danger" title="退出登录">
                                    <LogOut size={20} />
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '0 25px 15px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                <input type="text" placeholder="搜索联系人..." style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.5)', fontSize: 14, outline: 'none' }} />
                            </div>
                        </div>

                        <div className="contact-list">
                            {chats.map(chat => {
                                let chatInfo: string;
                                let avatarText: string;

                                if (chat.type === 'private' && chat.participants.length === 2) {
                                    const otherUserId = chat.participants.find(id => id !== user?.id);
                                    const displayName = otherUserId ? getUserDisplayName(otherUserId) : 'Unknown User';
                                    chatInfo = displayName;
                                    avatarText = displayName.slice(0, 2).toUpperCase();
                                } else {
                                    chatInfo = chat.name || 'Group Chat';
                                    avatarText = chatInfo.slice(0, 2).toUpperCase();
                                }

                                return (
                                    <div
                                        key={chat.id}
                                        className={`contact-item ${currentChat?.id === chat.id ? 'active' : ''}`}
                                        onClick={() => { setCurrentChat(chat); setMobileShowChat(true); }}
                                    >
                                        <div className="avatar" style={{ background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }}>
                                            {avatarText}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>{chatInfo}</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {chat.lastMessage?.content || '开始聊天吧'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className={`chat-area ${mobileShowChat ? 'active' : ''}`}>
                        {currentChat ? (
                            <>
                                <div className="chat-header">
                                    <button className="mobile-back" onClick={() => setMobileShowChat(false)}>
                                        <ChevronLeft size={24} />
                                    </button>
                                    <div className="avatar" style={{ width: 52, height: 52, fontSize: 18, background: currentChatInfo?.color }}>
                                        {currentChatInfo?.avatar}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3748' }}>{currentChatInfo?.name}</h3>
                                        <div style={{ fontSize: 12, color: currentChatInfo?.online ? '#2ecc71' : '#95a5a6', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>
                                            {currentChatInfo?.online ? '在线' : '离线'}
                                        </div>
                                    </div>
                                </div>

                                <div className="messages-box">
                                    {messages.length === 0 && (
                                        <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: 50, fontSize: 14 }}>
                                            打个招呼吧，这是你们聊天的开始~
                                        </div>
                                    )}
                                    {messages.map(msg => (
                                        <div key={msg.id} className={`message ${msg.senderId === user?.id ? 'me' : ''}`}>
                                            <div className="avatar" style={{
                                                width: 44, height: 44, fontSize: 15,
                                                background: msg.senderId === user?.id
                                                    ? 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)'
                                                    : currentChatInfo?.color
                                            }}>
                                                {msg.senderId === user?.id ? user?.displayName?.slice(0, 2) : currentChatInfo?.avatar}
                                            </div>
                                            <div className="message-content">
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="input-area">
                                    <input
                                        type="text"
                                        className="chat-input"
                                        placeholder="说点什么..."
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <button className="send-btn" onClick={handleSendMessage}>
                                        <Send size={20} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: '#a0aec0',
                                fontSize: 16
                            }}>
                                选择一个聊天开始对话
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;