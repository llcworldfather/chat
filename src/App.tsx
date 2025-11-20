import React, { useState, useEffect, useRef } from 'react';
import { Send, ChevronLeft, LogOut, Search } from 'lucide-react';
import './index.css';

// --- 类型定义 ---
interface User {
    username: string;
    email: string;
    avatarColor: string;
}

interface Message {
    id: number;
    text: string;
    sender: 'me' | 'other';
    timestamp: number;
}

interface Contact {
    id: number;
    name: string;
    role: string;
    avatar: string;
    color: string;
    online: boolean;
}

// --- 模拟数据 ---
const INITIAL_CONTACTS: Contact[] = [
    { id: 1, name: '张三', role: '产品经理', avatar: '张', color: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', online: true },
    { id: 2, name: '李四', role: '研发工程师', avatar: '李', color: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', online: true },
    { id: 3, name: '王五', role: 'UI设计师', avatar: '王', color: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', online: false },
];

const INITIAL_MESSAGES: Record<number, Message[]> = {
    1: [
        { id: 1, text: '新版本的 UI 你看了吗？', sender: 'other', timestamp: Date.now() - 10000 },
        { id: 2, text: '看了，玻璃拟态的效果很棒！', sender: 'me', timestamp: Date.now() - 5000 },
    ],
    2: [{ id: 3, text: '接口文档更新了', sender: 'other', timestamp: Date.now() }],
    3: [],
};

function App() {
    // --- 全局状态 ---
    const [user, setUser] = useState<User | null>(null);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

    // --- 聊天状态 ---
    const [activeContactId, setActiveContactId] = useState<number>(1);
    const [messages, setMessages] = useState<Record<number, Message[]>>(INITIAL_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [mobileShowChat, setMobileShowChat] = useState(false);

    // --- 认证表单状态 ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 初始化检查登录状态
    useEffect(() => {
        const storedUser = localStorage.getItem('chat_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeContactId, mobileShowChat]);

    // --- 认证逻辑 ---
    const handleLogin = () => {
        if (!email || !password) {
            setErrorMsg('请填写所有字段');
            return;
        }
        // 模拟登录：从 LocalStorage 获取注册用户，如果没有则允许测试账号
        const storedDb = JSON.parse(localStorage.getItem('chat_db') || '{}');

        if (storedDb[email] && storedDb[email].password === password) {
            const userData = {
                username: storedDb[email].username,
                email,
                avatarColor: 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)'
            };
            loginSuccess(userData);
        } else if (email === 'test@test.com' && password === '123456') {
            // 测试后门
            loginSuccess({ username: '测试用户', email, avatarColor: 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)' });
        } else {
            setErrorMsg('邮箱或密码错误 (可用 test@test.com / 123456)');
        }
    };

    const handleRegister = () => {
        if (!email || !password || !username) {
            setErrorMsg('请填写所有字段');
            return;
        }
        if (password.length < 6) {
            setErrorMsg('密码至少需要6位');
            return;
        }

        // 模拟注册：存入 LocalStorage
        const storedDb = JSON.parse(localStorage.getItem('chat_db') || '{}');
        if (storedDb[email]) {
            setErrorMsg('该邮箱已被注册');
            return;
        }

        storedDb[email] = { username, password };
        localStorage.setItem('chat_db', JSON.stringify(storedDb));

        // 自动登录
        loginSuccess({
            username,
            email,
            avatarColor: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)'
        });
    };

    const loginSuccess = (userData: User) => {
        setUser(userData);
        localStorage.setItem('chat_user', JSON.stringify(userData));
        setErrorMsg('');
        setEmail('');
        setPassword('');
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('chat_user');
        setAuthMode('login');
        setMobileShowChat(false);
    };

    // --- 聊天逻辑 ---
    const handleSendMessage = () => {
        if (!inputText.trim()) return;

        const newMsg: Message = {
            id: Date.now(),
            text: inputText,
            sender: 'me',
            timestamp: Date.now(),
        };

        setMessages(prev => ({
            ...prev,
            [activeContactId]: [...(prev[activeContactId] || []), newMsg]
        }));
        setInputText('');

        // 模拟自动回复
        setTimeout(() => {
            const contact = INITIAL_CONTACTS.find(c => c.id === activeContactId);
            const replyText = `我是${contact?.name}，我已收到你的消息："${newMsg.text}"`;

            const replyMsg: Message = {
                id: Date.now() + 1,
                text: replyText,
                sender: 'other',
                timestamp: Date.now(),
            };

            setMessages(prev => ({
                ...prev,
                [activeContactId]: [...(prev[activeContactId] || []), replyMsg]
            }));
        }, 1000 + Math.random() * 1000);
    };

    // --- 渲染：未登录状态 (Login/Register) ---
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
                            <h2 className="auth-title">
                                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="auth-subtitle">
                                {authMode === 'login' ? '登录账户体验清爽聊天' : '开启您的云端旅程'}
                            </p>

                            {errorMsg && <div style={{color: '#ff6b6b', fontSize: 14, marginBottom: 10, textAlign: 'center'}}>{errorMsg}</div>}

                            {authMode === 'register' && (
                                <div className="input-group">
                                    <label>用户名</label>
                                    <input
                                        className="input-field"
                                        type="text"
                                        placeholder="怎么称呼您？"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="input-group">
                                <label>邮箱地址</label>
                                <input
                                    className="input-field"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label>密码</label>
                                <input
                                    className="input-field"
                                    type="password"
                                    placeholder={authMode === 'register' ? "至少6位字符" : "••••••••"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>

                            <button
                                className="primary-btn"
                                onClick={authMode === 'login' ? handleLogin : handleRegister}
                            >
                                {authMode === 'login' ? '立即登录' : '注册并登录'}
                            </button>

                            <p className="switch-text">
                                {authMode === 'login' ? '还没有账户？' : '已有账户？'}
                                <span
                                    className="switch-link"
                                    onClick={() => {
                                        setAuthMode(authMode === 'login' ? 'register' : 'login');
                                        setErrorMsg('');
                                    }}
                                >
                  {authMode === 'login' ? '立即注册' : '立即登录'}
                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- 渲染：已登录状态 (Chat) ---
    const activeContact = INITIAL_CONTACTS.find(c => c.id === activeContactId);
    const currentMessages = messages[activeContactId] || [];

    return (
        <div className="app-wrapper">
            <div className="glass-container">
                {/* 窗口控制点 */}
                <div className="window-controls">
                    <div className="window-dot close"></div>
                    <div className="window-dot minimize"></div>
                    <div className="window-dot maximize"></div>
                </div>

                <div className="chat-layout">
                    {/* 左侧联系人列表 */}
                    <div className="sidebar">
                        <div className="sidebar-header">
                            <h3>Messages</h3>
                            <button onClick={handleLogout} className="logout-btn" title="退出登录">
                                <LogOut size={18} />
                            </button>
                        </div>

                        <div style={{ padding: '0 15px 10px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                <input
                                    type="text"
                                    placeholder="搜索联系人..."
                                    style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.5)', fontSize: 14, outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div className="contact-list">
                            {INITIAL_CONTACTS.map(contact => (
                                <div
                                    key={contact.id}
                                    className={`contact-item ${activeContactId === contact.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveContactId(contact.id);
                                        setMobileShowChat(true);
                                    }}
                                >
                                    <div className={`avatar ${contact.online ? 'online' : ''}`} style={{ background: contact.color }}>
                                        {contact.avatar}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>{contact.name}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {messages[contact.id]?.slice(-1)[0]?.text || contact.role}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 右侧聊天窗口 */}
                    <div className={`chat-area ${mobileShowChat ? 'active' : ''}`}>
                        <div className="chat-header">
                            <button className="mobile-back" onClick={() => setMobileShowChat(false)}>
                                <ChevronLeft size={24} />
                            </button>
                            <div className="avatar" style={{ width: 38, height: 38, fontSize: 14, background: activeContact?.color }}>
                                {activeContact?.avatar}
                            </div>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3748' }}>{activeContact?.name}</h3>
                                <div style={{ fontSize: 12, color: activeContact?.online ? '#2ecc71' : '#95a5a6', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>
                                    {activeContact?.online ? '在线' : '离线'}
                                </div>
                            </div>
                        </div>

                        <div className="messages-box">
                            {currentMessages.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: 50, fontSize: 14 }}>
                                    暂无消息，打个招呼吧~
                                </div>
                            )}
                            {currentMessages.map(msg => (
                                <div key={msg.id} className={`message ${msg.sender === 'me' ? 'me' : ''}`}>
                                    <div className="avatar" style={{
                                        width: 32, height: 32, fontSize: 12,
                                        background: msg.sender === 'me' ? user.avatarColor : activeContact?.color
                                    }}>
                                        {msg.sender === 'me' ? user.username[0] : activeContact?.avatar}
                                    </div>
                                    <div className="message-content">
                                        {msg.text}
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
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;