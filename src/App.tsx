import React, { useState, useEffect, useRef } from 'react';
import { Send, ChevronLeft, LogOut, Search, UserPlus, X, AlertCircle, Settings, Camera, Lock, Mail, User as UserIcon, Save } from 'lucide-react';
import { useChat } from './context/ChatContext';
import './index.css';

function App() {
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
        updateUserProfile,
        onlineUsers,
        loading,
        error
    } = useChat();

    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [inputText, setInputText] = useState('');
    const [mobileShowChat, setMobileShowChat] = useState(false);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [newContactName, setNewContactName] = useState('');

    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileForm, setProfileForm] = useState({
        displayName: '',
        email: '',
        password: '',
        avatar: ''
    });

    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');

    const [userCache, setUserCache] = useState<Map<string, any>>(() => {
        try {
            const savedCache = localStorage.getItem('app_user_cache');
            if (savedCache) return new Map(JSON.parse(savedCache));
        } catch (e) {}
        return new Map();
    });

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, currentChat]);

    useEffect(() => {
        if (userCache.size > 0) {
            localStorage.setItem('app_user_cache', JSON.stringify(Array.from(userCache.entries())));
        }
    }, [userCache]);

    useEffect(() => {
        if (onlineUsers && onlineUsers.length > 0) {
            setUserCache(prev => {
                const newCache = new Map(prev);
                let changed = false;
                onlineUsers.forEach(u => {
                    if (u.id && (u.displayName || u.username) && !newCache.has(u.id)) {
                        newCache.set(u.id, u);
                        changed = true;
                    }
                });
                return changed ? newCache : prev;
            });
        }
    }, [onlineUsers]);

    useEffect(() => {
        if (chats && chats.length > 0) {
            setUserCache(prev => {
                const newCache = new Map(prev);
                let changed = false;
                chats.forEach(chat => {
                    chat.participants?.forEach((p: any) => {
                        const id = typeof p === 'string' ? p : p.id;
                        const name = typeof p === 'object' ? (p.displayName || p.username) : null;
                        // 如果是在线用户，尝试补全信息
                        if (typeof p === 'string') {
                            const online = onlineUsers.find(u => u.id === p);
                            if(online && !newCache.has(p)) { newCache.set(p, online); changed = true; }
                        } else if (name && !newCache.has(id)) {
                            newCache.set(id, p);
                            changed = true;
                        }
                    });
                    (chat as any).participantsWithInfo?.forEach((p: any) => {
                        if (p.id && !newCache.has(p.id)) { newCache.set(p.id, p); changed = true; }
                    });
                });
                return changed ? newCache : prev;
            });
        }
    }, [chats, onlineUsers]);

    // Init profile form
    useEffect(() => {
        if (showProfileModal && user) {
            setProfileForm({
                displayName: user.displayName || '',
                email: user.email || '',
                password: '',
                avatar: user.avatar || ''
            });
            setModalError('');
            setModalSuccess('');
        }
    }, [showProfileModal, user]);

    const handleLogin = async () => { if (!username || !password) return; await login(username, password); };
    const handleRegister = async () => { if (!username || !password) return; await register({ username, displayName: username, password }); };
    const handleLogout = () => { logout(); setAuthMode('login'); setMobileShowChat(false); };

    const getUserDisplayName = (userId: string): string => {
        if (user?.id === userId) return user.displayName || user.username;
        const cached = userCache.get(userId);
        if (cached?.displayName) return cached.displayName;
        const online = onlineUsers.find(u => u.id === userId);
        if (online) return online.displayName || online.username;
        return `User ${userId.slice(0, 6)}`;
    };

    const handleAddContact = async () => {
        setModalError('');
        if (!newContactName.trim() || loading) return;
        if (newContactName === user?.username) { setModalError('不能添加自己为好友'); return; }

        // 简单起见，不做重名检查，依赖后端报错

        try {
            await addFriend(newContactName);
            setNewContactName('');
            setShowAddModal(false);
        } catch (e: any) {
            setModalError(e.message || '添加失败');
        }
    };

    const handleUpdateProfile = async () => {
        setModalError(''); setModalSuccess('');
        if (!profileForm.displayName.trim()) { setModalError('显示名称不能为空'); return; }
        try {
            const data: any = { displayName: profileForm.displayName, email: profileForm.email, avatar: profileForm.avatar };
            if (profileForm.password) {
                if (profileForm.password.length < 6) { setModalError('密码太短'); return; }
                data.password = profileForm.password;
            }
            await updateUserProfile(data);
            setModalSuccess('更新成功');
            setTimeout(() => setShowProfileModal(false), 1500);
        } catch (e: any) {
            setModalError(e.message || '更新失败');
        }
    };

    const generateRandomAvatar = () => {
        const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileForm.displayName || user?.username || '')}&background=random&size=128`;
        setProfileForm(prev => ({ ...prev, avatar: url }));
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setProfileForm(prev => ({ ...prev, avatar: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = () => {
        if (!inputText.trim() || !currentChat) return;
        sendMessage(currentChat.id, inputText);
        setInputText('');
    };

    const getCurrentChatInfo = () => {
        if (!currentChat) return null;
        if (currentChat.type === 'private' && currentChat.participants.length === 2) {
            const otherUserId = currentChat.participants.find(p => p !== user?.id);
            const displayName = otherUserId ? getUserDisplayName(otherUserId) : 'Unknown';
            const isOnline = onlineUsers.some(u => u.id === otherUserId);

            // 获取对方用户的头像信息 - 优先使用 onlineUsers 中的最新数据
            let otherUserAvatar: string | undefined;
            if (otherUserId) {
                const otherUser = onlineUsers.find(u => u.id === otherUserId) || userCache.get(otherUserId);
                otherUserAvatar = otherUser?.avatar;
            }

            return {
                name: displayName,
                avatar: otherUserAvatar && !otherUserAvatar.includes('ui-avatars.com') ? null : displayName.slice(0, 2).toUpperCase(),
                avatarUrl: otherUserAvatar && !otherUserAvatar.includes('ui-avatars.com') ? otherUserAvatar : null,
                color: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                online: isOnline
            };
        }
        return {
            name: currentChat.name || 'Group',
            avatar: (currentChat.name || 'G').slice(0,2).toUpperCase(),
            avatarUrl: null,
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            online: true
        };
    };
    const currentChatInfo = getCurrentChatInfo();

    if (!user) {
        // Login/Register View (保持不变)
        return (
            <div className="app-wrapper">
                <div className="glass-container">
                    <div className="window-controls"><div className="window-dot close"></div><div className="window-dot minimize"></div><div className="window-dot maximize"></div></div>
                    <div className="auth-layout">
                        <div className="auth-box">
                            <h2 className="auth-title">{authMode === 'login' ? 'Welcome Back' : 'Join Chat'}</h2>
                            <p className="auth-subtitle">{authMode === 'login' ? '登录账户体验清爽聊天' : '创建账户，开启精彩对话'}</p>
                            {error && <div style={{color:'#ff6b6b',fontSize:14,marginBottom:10,textAlign:'center'}}>{error}</div>}

                            {authMode === 'register' && (
                                <>
                                    <div className="input-group"><label>账号</label><input className="input-field" value={username} onChange={e=>setUsername(e.target.value)} disabled={loading}/></div>
                                    <div className="input-group"><label>邮箱</label><input className="input-field" value={email} onChange={e=>setEmail(e.target.value)} disabled={loading}/></div>
                                </>
                            )}
                            {authMode === 'login' && <div className="input-group"><label>账号</label><input className="input-field" value={username} onChange={e=>setUsername(e.target.value)} disabled={loading}/></div>}

                            <div className="input-group"><label>密码</label><input className="input-field" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(authMode==='login'?handleLogin():handleRegister())} disabled={loading}/></div>

                            <button className="primary-btn" onClick={authMode==='login'?handleLogin:handleRegister} disabled={loading}>
                                {loading?'处理中...':(authMode==='login'?'立即登录':'注册并登录')}
                            </button>
                            <p className="switch-text">
                                {authMode==='login'?'还没有账户？':'已有账户？'}
                                <span className="switch-link" onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>
                                    {authMode==='login'?'立即注册':'立即登录'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-wrapper">
            <div className="glass-container">
                {/* Add Friend Modal */}
                {showAddModal && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ paddingBottom: 30 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#2d3748', margin: 0 }}>添加新朋友</h3>
                                <button className="icon-btn" onClick={() => { setShowAddModal(false); setModalError(''); }}><X size={20} /></button>
                            </div>
                            {modalError && (
                                <div style={{ marginBottom: 20, padding: '12px', background: 'rgba(254,226,226,0.6)', borderRadius: 12, color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertCircle size={16}/> {modalError}
                                </div>
                            )}
                            <div className="input-group">
                                <label style={{display:'block', marginBottom:8}}>好友账号</label>
                                <div style={{position:'relative'}}>
                                    <input className="input-field" style={{paddingRight:40, borderColor: modalError ? '#fca5a5' : undefined}} autoFocus value={newContactName} onChange={e => { setNewContactName(e.target.value); setModalError(''); }} onKeyDown={e => e.key==='Enter' && !loading && handleAddContact()} placeholder="输入用户名..."/>
                                    <div style={{position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', color:'#a0aec0'}}><UserPlus size={18}/></div>
                                </div>
                            </div>
                            <button className="primary-btn" onClick={handleAddContact} disabled={loading} style={{marginTop:'auto', opacity: loading?0.7:1}}>
                                {loading ? '添加中...' : '确认添加'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Profile Modal */}
                {showProfileModal && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ width: 420 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#2d3748', margin: 0 }}>编辑个人资料</h3>
                                <button className="icon-btn" onClick={() => setShowProfileModal(false)}><X size={20} /></button>
                            </div>

                            {modalError && <div style={{ marginBottom: 16, padding: 12, background: 'rgba(254,226,226,0.6)', borderRadius: 12, color: '#dc2626', fontSize: 14 }}>{modalError}</div>}
                            {modalSuccess && <div style={{ marginBottom: 16, padding: 12, background: 'rgba(209,250,229,0.6)', borderRadius: 12, color: '#059669', fontSize: 14 }}>{modalSuccess}</div>}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 80, height: 80, borderRadius: 24, overflow: 'hidden', position: 'relative', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} onClick={handleAvatarClick} className="group">
                                        {profileForm.avatar && !profileForm.avatar.includes('ui-avatars.com') ? (
                                            <img src={profileForm.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'white', fontWeight: 'bold' }}>
                                                {profileForm.displayName?.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }} className="group-hover:opacity-100">
                                            <Camera color="white" />
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 14, fontWeight: 600, color: '#4a5568', marginBottom: 8 }}>个人头像</p>
                                        <button onClick={generateRandomAvatar} style={{ fontSize: 12, color: '#4facfe', background: '#ebf8ff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                                            随机头像
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>显示名称</label>
                                    <div style={{ position: 'relative' }}>
                                        <input className="input-field" style={{ paddingLeft: 40 }} value={profileForm.displayName} onChange={e => setProfileForm({...profileForm, displayName: e.target.value})} placeholder="昵称" />
                                        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}><UserIcon size={18} /></div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>邮箱</label>
                                    <div style={{ position: 'relative' }}>
                                        <input className="input-field" style={{ paddingLeft: 40 }} value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} placeholder="邮箱" />
                                        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}><Mail size={18} /></div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                        新密码 <span style={{ fontWeight: 400, color: '#cbd5e0', textTransform: 'none' }}>(选填)</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input className="input-field" type="password" style={{ paddingLeft: 40 }} value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} placeholder="输入新密码" />
                                        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}><Lock size={18} /></div>
                                    </div>
                                </div>
                            </div>

                            <button className="primary-btn" onClick={handleUpdateProfile} disabled={loading} style={{ marginTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading ? '保存中...' : <><Save size={18}/> 保存修改</>}
                            </button>
                        </div>
                    </div>
                )}

                <div className="window-controls"><div className="window-dot close"></div><div className="window-dot minimize"></div><div className="window-dot maximize"></div></div>

                <div className="chat-layout">
                    <div className="sidebar">
                        <div className="sidebar-header">
                            <h3>Messages</h3>
                            <button onClick={() => setShowAddModal(true)} className="icon-btn" title="添加好友"><UserPlus size={20} /></button>
                        </div>
                        <div style={{ padding: '0 25px 15px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                <input type="text" placeholder="搜索联系人..." style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.5)', fontSize: 14, outline: 'none' }} />
                            </div>
                        </div>
                        <div className="contact-list">
                            {chats.map(chat => {
                                let info: any = {};
                                if (chat.type === 'private') {
                                    const pid = chat.participants.find(id => id !== user.id);
                                    const name = getUserDisplayName(pid as string);
                                    const online = onlineUsers.some(u => u.id === pid);

                                    // 获取对方用户的头像信息 - 优先使用 onlineUsers 中的最新数据
                                    let otherUserAvatar: string | undefined;
                                    if (pid) {
                                        const otherUser = onlineUsers.find(u => u.id === pid) || userCache.get(pid);
                                        otherUserAvatar = otherUser?.avatar;
                                    }

                                    info = {
                                        name,
                                        avatar: otherUserAvatar && !otherUserAvatar.includes('ui-avatars.com') ? null : name.slice(0,2).toUpperCase(),
                                        avatarUrl: otherUserAvatar && !otherUserAvatar.includes('ui-avatars.com') ? otherUserAvatar : null,
                                        color: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                                        online
                                    };
                                } else {
                                    info = { name: chat.name, avatar: chat.name?.slice(0,2).toUpperCase(), avatarUrl: null, color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', online: true };
                                }
                                return (
                                    <div key={chat.id} className={`contact-item ${currentChat?.id===chat.id?'active':''}`} onClick={()=>{setCurrentChat(chat);setMobileShowChat(true)}}>
                                        <div className="avatar" style={{ background: info.color, position: 'relative' }}>
                                            {info.avatarUrl ? (
                                                <img src={info.avatarUrl} alt={info.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}/>
                                            ) : (
                                                info.avatar
                                            )}
                                            {info.online && <div style={{position:'absolute',bottom:0,right:0,width:12,height:12,background:'#48bb78',borderRadius:'50%',border:'2px solid white'}}/>}
                                        </div>
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{fontWeight:700,fontSize:15,color:'#2d3748'}}>{info.name}</div>
                                            <div style={{fontSize:13,color:'#718096',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{chat.lastMessage?.content || '开始聊天吧'}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Bottom User Profile */}
                        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowProfileModal(true)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }}>
                                    {user.avatar && !user.avatar.includes('ui-avatars.com') ? <img src={user.avatar} alt="me" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:14}}/> : user.displayName?.slice(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748' }}>{user.displayName}</div>
                                    <div style={{ fontSize: 11, color: '#48bb78' }}>● 在线</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button className="icon-btn"><Settings size={16}/></button>
                                <button className="icon-btn danger" onClick={(e)=>{e.stopPropagation();handleLogout()}}><LogOut size={16}/></button>
                            </div>
                        </div>
                    </div>

                    <div className={`chat-area ${mobileShowChat ? 'active' : ''}`}>
                        {currentChat ? (
                            <>
                                <div className="chat-header">
                                    <button className="mobile-back" onClick={()=>setMobileShowChat(false)}><ChevronLeft/></button>
                                    <div className="avatar" style={{width:52,height:52,fontSize:18,background:currentChatInfo?.color}}>
                                        {currentChatInfo?.avatarUrl ? (
                                            <img src={currentChatInfo.avatarUrl} alt={currentChatInfo.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}/>
                                        ) : (
                                            currentChatInfo?.avatar
                                        )}
                                    </div>
                                    <div>
                                        <h3 style={{fontSize:16,fontWeight:700,color:'#2d3748'}}>{currentChatInfo?.name}</h3>
                                        <div style={{fontSize:12,color:currentChatInfo?.online?'#48bb78':'#a0aec0'}}>{currentChatInfo?.online?'在线':'离线'}</div>
                                    </div>
                                </div>
                                <div className="messages-box">
                                    {messages.map(msg => (
                                        <div key={msg.id} className={`message ${msg.senderId===user.id?'me':''}`}>
                                            <div className="avatar" style={{width:44,height:44,fontSize:15,background:msg.senderId===user.id?'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)':currentChatInfo?.color}}>
                                                {msg.senderId===user.id ? (
                                                    user.avatar && !user.avatar.includes('ui-avatars.com') ?
                                                    <img src={user.avatar} alt="me" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:12}}/> :
                                                    user.displayName?.slice(0,2).toUpperCase()
                                                ) : (
                                                    currentChatInfo?.avatarUrl ?
                                                    <img src={currentChatInfo.avatarUrl} alt={currentChatInfo.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:12}}/> :
                                                    currentChatInfo?.avatar
                                                )}
                                            </div>
                                            <div className="message-content">{msg.content}</div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef}/>
                                </div>
                                <div className="input-area">
                                    <input className="chat-input" placeholder="说点什么..." value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSendMessage()}/>
                                    <button className="send-btn" onClick={handleSendMessage}><Send size={20}/></button>
                                </div>
                            </>
                        ) : (
                            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#a0aec0'}}>选择一个聊天开始对话</div>
                        )}
                    </div>
                </div>
            </div>
            {/* 隐藏的文件输入框用于头像上传 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />
        </div>
    );
}

export default App;