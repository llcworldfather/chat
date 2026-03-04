import React, { useState, useEffect, useRef } from 'react';
import { Send, ChevronLeft, LogOut, Search, UserPlus, X, AlertCircle, Settings, Camera, Lock, User as UserIcon, Save, CheckCircle, Smile, Plus, MoreHorizontal, Trash2, Eraser, UserCheck, Ban, Sparkles } from 'lucide-react';
import { useChat } from './context/ChatContext';
import { socketService } from './services/socket';
import { formatMessageDate } from './utils/timeUtils';
import './index.css';

// 表情数据结构分类
const EMOJI_CATEGORIES = [
    {
        id: 'smileys',
        label: '表情',
        list: [
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
            '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
            '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝',
            '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '😐', '😑',
            '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔',
            '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
            '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳',
            '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮'
        ]
    },
    {
        id: 'black_people',
        label: '人物(黑)',
        list: [
            '👋🏿', '🤚🏿', '🖐🏿', '✋🏿', '🖖🏿', '👌🏿', '🤌🏿', '🤏🏿',
            '✌️🏿', '🤞🏿', '🤟🏿', '🤘🏿', '🤙🏿', '👈🏿', '👉🏿', '👆🏿',
            '👇🏿', '👍🏿', '👎🏿', '👊🏿', '✊🏿', '🤛🏿', '🤜🏿', '👏🏿',
            '🙌🏿', '👐🏿', '🤲🏿', '🤝🏿', '🙏🏿', '💅🏿', '🤳🏿', '💪🏿',
            '👦🏿', '👧🏿', '👨🏿', '👩🏿', '👴🏿', '👵🏿', '👶🏿', '👮🏿',
            '🕵️🏿', '💂🏿', '👷🏿', '🤴🏿', '👸🏿', '👳🏿', '👲🏿', '🧕🏿',
            '🤵🏿', '👰🏿', '🤰🏿', '🤱🏿', '👼🏿', '🎅🏿', '🧙🏿', '🧚🏿',
            '🧛🏿', '🧜🏿', '🧝🏿', '💆🏿', '💇🏿', '🚶🏿', '🏃🏿', '💃🏿',
            '🕺🏿', '🧖🏿', '🧘🏿', '🛀🏿', '🛌🏿', '🕴🏿', '🗣🏿', '👤🏿'
        ]
    },
    {
        id: 'gestures',
        label: '手势',
        list: [
            '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏',
            '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
            '👇', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏',
            '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳',
            '💪', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀'
        ]
    },
    {
        id: 'hearts',
        label: '心情',
        list: [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
            '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
            '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
            '🎉', '✨', '🔥', '💯', '💢', '💥', '💫', '💦',
            '💤', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭'
        ]
    }
];

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
        loadFriendRequests,
        loadSentFriendRequests,
        handleFriendRequest,
        removeFriend,
        clearChatMessages,
        createNewPigsailChat,
        updateUserProfile,
        onlineUsers,
        typingUsers,
        friendRequests,
        sentFriendRequests,
        loading,
        error,
        getUserInfo,
        clearError
    } = useChat();

    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [inputText, setInputText] = useState('');
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [sentRequestFilter, setSentRequestFilter] = useState<'all' | 'pending'>('all');
    const [newContactName, setNewContactName] = useState('');
    const [showProfileModal, setShowProfileModal] = useState(false); // 编辑自己资料
    const [profileForm, setProfileForm] = useState({
        displayName: '',
        password: '',
        confirmPassword: '',
        avatar: ''
    });
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeEmojiCategory, setActiveEmojiCategory] = useState('smileys');
    const [isPigsailExpanded, setIsPigsailExpanded] = useState(true);
    const [isFriendExpanded, setIsFriendExpanded] = useState(true);
    const [isGroupExpanded, setIsGroupExpanded] = useState(true);
    const [activeContactMenuChatId, setActiveContactMenuChatId] = useState<string | null>(null);

    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');

    // [新增] 查看用户详情 & 头像预览 状态
    const [viewingUser, setViewingUser] = useState<any>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const emojiBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, currentChat, typingUsers]);

    useEffect(() => {
        const closeMenu = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.contact-action-menu')) {
                setActiveContactMenuChatId(null);
            }
        };
        document.addEventListener('mousedown', closeMenu);
        return () => document.removeEventListener('mousedown', closeMenu);
    }, []);

    // 监听全局点击事件，点击外部关闭表情面板
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (showEmojiPicker &&
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target as Node) &&
                emojiBtnRef.current &&
                !emojiBtnRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showEmojiPicker]);

    // Error handling Effect
    useEffect(() => {
        if (showAddModal && error) {
            let errorMsg = '';
            if (typeof error === 'string') errorMsg = error;
            else if (typeof error === 'object' && (error as any).message) errorMsg = (error as any).message;
            else errorMsg = JSON.stringify(error);

            const lowerError = errorMsg.toLowerCase();
            if (lowerError.includes('not found') || lowerError.includes('不存在')) {
                setModalError('未找到该账号，请检查输入是否正确');
            } else if (lowerError.includes('failed to add') || lowerError.includes('conflict') || lowerError.includes('already')) {
                setModalError('添加失败，该用户可能已经是您的好友');
            } else {
                setModalError(errorMsg);
            }
        }
    }, [error, showAddModal]);

    const switchAuthMode = (mode: 'login' | 'register') => {
        setAuthMode(mode);
        clearError();
        setUsername('');
        setPassword('');
        setDisplayName('');
    };

    useEffect(() => {
        if (showProfileModal && user) {
            setProfileForm({
                displayName: user.displayName || '',
                password: '',
                confirmPassword: '',
                avatar: user.avatar || ''
            });
            setModalError('');
            setModalSuccess('');
        }
    }, [showProfileModal, user]);

    const handleLogin = async () => { if (!username || !password) return; await login(username, password); };
    const handleRegister = async () => {
        if (!username || !password || !displayName) return;
        await register({ username, displayName, password });
    };
    const handleLogout = () => { logout(); setAuthMode('login'); setMobileShowChat(false); };

    const getUserDisplayName = (userId: string): string => {
        const u = getUserInfo(userId);
        return u ? (u.displayName || u.username) : `User ${userId.slice(0, 6)}`;
    };

    const getOtherParticipantId = (chat: any): string | null => {
        if (!chat || chat.type !== 'private') return null;
        const pid = chat.participants.find((id: string) => id !== user?.id);
        return pid || null;
    };

    const pigsailIdSet = new Set<string>();
    onlineUsers.forEach(u => {
        if ((u.username || '').toLowerCase() === 'pigsail' || (u.displayName || '').toLowerCase() === 'pigsail') {
            pigsailIdSet.add(u.id);
        }
    });
    chats.forEach(chat => {
        if (chat.type === 'private' && (chat.name || '').toLowerCase().includes('pigsail')) {
            const pid = getOtherParticipantId(chat);
            if (pid) pigsailIdSet.add(pid);
        }
    });

    const isPigsailChat = (chat: any): boolean => {
        if (chat.type !== 'private') return false;
        const pid = getOtherParticipantId(chat);
        if (!pid) return false;
        const otherUser = getUserInfo(pid);
        const byUsername = (otherUser?.username || '').toLowerCase() === 'pigsail';
        const byDisplayName = (otherUser?.displayName || '').toLowerCase() === 'pigsail';
        const byChatName = (chat.name || '').toLowerCase().includes('pigsail');
        const byKnownPigsailId = pigsailIdSet.has(pid);
        return byUsername || byDisplayName || byChatName || byKnownPigsailId;
    };

    const filteredChats = chats.filter(chat => {
        if (!searchQuery) return true;
        const lowerQuery = searchQuery.toLowerCase();
        if (chat.type === 'private') {
            const pid = chat.participants.find(id => id !== user?.id);
            if (!pid) return false;
            const otherUser = getUserInfo(pid);
            const isPigsail = (otherUser?.username || '').toLowerCase() === 'pigsail' || (otherUser?.displayName || '').toLowerCase() === 'pigsail';
            const name = isPigsail
                ? (chat.name || otherUser?.displayName || otherUser?.username || '')
                : getUserDisplayName(pid);
            return name.toLowerCase().includes(lowerQuery);
        } else {
            return chat.name?.toLowerCase().includes(lowerQuery);
        }
    });

    const pigsailChats = filteredChats.filter(chat => isPigsailChat(chat));
    const normalChats = filteredChats.filter(chat => !isPigsailChat(chat));
    const friendChats = normalChats.filter(chat => chat.type === 'private');
    const groupChats = normalChats.filter(chat => chat.type === 'group');

    const handleAddContact = async () => {
        setModalError('');
        if (!newContactName.trim() || loading) return;
        if (newContactName === user?.username) { setModalError('不能添加自己为好友'); return; }
        try {
            await addFriend(newContactName);
            setNewContactName('');
            setShowAddModal(false);
            window.alert('好友申请已发送，等待对方处理');
        } catch (e: any) {}
    };

    const openFriendRequests = async () => {
        try {
            await loadFriendRequests();
            await loadSentFriendRequests();
            setShowRequestsModal(true);
        } catch (e) {
            setShowRequestsModal(true);
        }
    };

    const onHandleFriendRequest = async (requestId: string, action: 'accept' | 'reject' | 'block') => {
        try {
            await handleFriendRequest(requestId, action);
        } catch (e: any) {
            window.alert(e?.message || '处理好友申请失败');
        }
    };

    const getRequestStatusText = (status: 'pending' | 'accepted' | 'rejected' | 'blocked') => {
        if (status === 'accepted') return { text: '已接受', color: '#059669', bg: 'rgba(16,185,129,0.12)' };
        if (status === 'rejected') return { text: '已拒绝', color: '#ca8a04', bg: 'rgba(250,204,21,0.18)' };
        if (status === 'blocked') return { text: '已拉黑', color: '#dc2626', bg: 'rgba(248,113,113,0.15)' };
        return { text: '待处理', color: '#2563eb', bg: 'rgba(96,165,250,0.18)' };
    };

    const filteredSentFriendRequests = sentRequestFilter === 'pending'
        ? sentFriendRequests.filter((request) => request.status === 'pending')
        : sentFriendRequests;

    const handleCreatePigsailChat = async () => {
        try {
            await createNewPigsailChat();
        } catch (e) {
            // error already handled in context
        }
    };

    const handleRemoveFriend = async (friendId: string, friendName: string) => {
        if (!window.confirm(`确认删除好友 "${friendName}" 吗？`)) return;
        try {
            await removeFriend(friendId);
            setActiveContactMenuChatId(null);
            if (currentChat?.type === 'private' && currentChat.participants.includes(friendId)) {
                setMobileShowChat(false);
            }
        } catch (e: any) {
            window.alert(e?.message || '删除好友失败');
        }
    };

    const handleClearConversation = async (chatId: string) => {
        if (!window.confirm('确认清空与该联系人的全部聊天记录吗？')) return;
        try {
            await clearChatMessages(chatId);
            setActiveContactMenuChatId(null);
        } catch (e: any) {
            window.alert(e?.message || '清空聊天记录失败');
        }
    };

    const handleUpdateProfile = async () => {
        setModalError(''); setModalSuccess('');
        if (!profileForm.displayName.trim()) { setModalError('显示名称不能为空'); return; }
        const data: any = { displayName: profileForm.displayName, avatar: profileForm.avatar };
        if (profileForm.password) {
            if (profileForm.password.length < 6) { setModalError('密码太短'); return; }
            if (profileForm.password !== profileForm.confirmPassword) { setModalError('两次输入的密码不一致'); return; }
            data.password = profileForm.password;
        }
        try {
            await updateUserProfile(data);
            setModalSuccess('更新成功');
            setTimeout(() => setShowProfileModal(false), 1500);
        } catch (e: any) {
            const errorMsg = e.message || '';
            if (errorMsg.includes('413') || errorMsg.toLowerCase().includes('too large')) {
                setModalError('图片文件过大，请尝试使用更小的图片');
            } else {
                setModalError(errorMsg || '更新失败');
            }
        }
    };

    const generateRandomAvatar = async () => {
        try {
            const avatarUrl = await socketService.getRandomAvatar();
            setProfileForm(prev => ({ ...prev, avatar: avatarUrl }));
        } catch (error) {
            console.error('Failed to get random avatar:', error);
            const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileForm.displayName || user?.username || '')}&background=random&size=128`;
            setProfileForm(prev => ({ ...prev, avatar: url }));
        }
    };
    const handleAvatarClick = () => { fileInputRef.current?.click(); };
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 10 * 1024 * 1024) {
                setModalError('选择的图片过大，请选择小于 10MB 的图片');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 512; const MAX_HEIGHT = 512;
                    let width = img.width; let height = img.height;
                    if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                    else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        setProfileForm(prev => ({ ...prev, avatar: compressedDataUrl }));
                        setModalError('');
                    }
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = () => {
        if (!inputText.trim() || !currentChat) return;
        sendMessage(currentChat.id, inputText);
        setInputText('');
        setShowEmojiPicker(false);
    };

    const handleEmojiSelect = (emoji: string) => {
        setInputText(prev => prev + emoji);
        inputRef.current?.focus();
    };

    const getCurrentChatInfo = () => {
        if (!currentChat) return null;
        if (currentChat.type === 'private' && currentChat.participants.length === 2) {
            const otherUserId = currentChat.participants.find(p => p !== user?.id);
            const otherUser = otherUserId ? getUserInfo(otherUserId) : null;
            const displayName = currentChat.name || (otherUser ? (otherUser.displayName || otherUser.username) : 'Unknown');
            const isOnline = onlineUsers.some(u => u.id === otherUserId);

            return {
                userId: otherUserId, // [新增] 方便点击头像获取 ID
                name: displayName,
                avatar: otherUser?.avatar ? null : displayName.slice(0, 2).toUpperCase(),
                avatarUrl: otherUser?.avatar || null,
                color: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                isOnline: isOnline,
                isGroup: false
            };
        }
        return {
            userId: null,
            name: currentChat.name || 'Group',
            avatar: (currentChat.name || 'G').slice(0,2).toUpperCase(),
            avatarUrl: null,
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            isOnline: false,
            isGroup: true
        };
    };
    const currentChatInfo = getCurrentChatInfo();
    const isOwnMessage = (message: any) => message.senderId === user?.id;

    const formatTimeShort = (date: Date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

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

    // [新增] 处理查看用户详情
    const handleViewUser = (userId: string) => {
        if (!userId) return;
        if (userId === user?.id) {
            setShowProfileModal(true); // 看自己 -> 编辑资料
        } else {
            const u = getUserInfo(userId);
            if (u) {
                setViewingUser(u); // 看别人 -> 用户详情
            }
        }
    };

    if (!user) {
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
                                    <div className="input-group">
                                        <label>用户名</label>
                                        <input className="input-field" value={displayName} onChange={e=>{setDisplayName(e.target.value); if(error) clearError();}} disabled={loading} placeholder="想要我们怎么称呼您"/>
                                    </div>
                                    <div className="input-group">
                                        <label>账号</label>
                                        <input className="input-field" value={username} onChange={e=>{setUsername(e.target.value); if(error) clearError();}} disabled={loading} placeholder="用于登录的唯一ID"/>
                                    </div>
                                </>
                            )}
                            {authMode === 'login' && (
                                <div className="input-group">
                                    <label>账号</label>
                                    <input className="input-field" value={username} onChange={e=>{setUsername(e.target.value); if(error) clearError();}} disabled={loading}/>
                                </div>
                            )}
                            <div className="input-group">
                                <label>密码</label>
                                <input className="input-field" type="password" value={password} onChange={e=>{setPassword(e.target.value); if(error) clearError();}} onKeyDown={e=>e.key==='Enter'&&(authMode==='login'?handleLogin():handleRegister())} disabled={loading}/>
                            </div>
                            <button className="primary-btn" onClick={authMode==='login'?handleLogin:handleRegister} disabled={loading}>{loading?'处理中...':(authMode==='login'?'立即登录':'注册并登录')}</button>
                            <p className="switch-text">
                                {authMode==='login'?'还没有账户？':'已有账户？'}
                                <span className="switch-link" onClick={()=>switchAuthMode(authMode==='login'?'register':'login')}>
                                    {authMode==='login'?'立即注册':'立即登录'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentTypingUsers = typingUsers.filter(
        typingUser => typingUser.chatId === currentChat?.id && typingUser.userId !== user?.id
    );

    return (
        <div className="app-wrapper">
            <div className="glass-container">
                {/* --- 模态框区域 --- */}

                {/* 1. 添加好友 Modal */}
                {showAddModal && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ paddingBottom: 30 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#2d3748', margin: 0 }}>添加新朋友</h3>
                                <button className="icon-btn" onClick={() => { setShowAddModal(false); setModalError(''); clearError(); }}>
                                    <X size={20} />
                                </button>
                            </div>
                            {modalError && (<div style={{ marginBottom: 20, padding: '12px', background: 'rgba(254,226,226,0.6)', borderRadius: 12, color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={16}/> {modalError}</div>)}
                            <div className="input-group"><label style={{display:'block', marginBottom:8}}>好友账号</label><div style={{position:'relative'}}><input className="input-field" style={{paddingRight:40, borderColor: modalError ? '#fca5a5' : undefined}} autoFocus value={newContactName} onChange={e => { setNewContactName(e.target.value); setModalError(''); }} onKeyDown={e => e.key==='Enter' && !loading && handleAddContact()} placeholder="输入用户账号"/><div style={{position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', color:'#a0aec0'}}><UserPlus size={18}/></div></div></div>
                            <button className="primary-btn" onClick={handleAddContact} disabled={loading} style={{marginTop:'auto', opacity: loading?0.7:1}}>{loading ? '添加中...' : '确认添加'}</button>
                        </div>
                    </div>
                )}

                {showRequestsModal && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ width: 480, maxHeight: '80vh' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#2d3748', margin: 0 }}>好友申请</h3>
                                <button className="icon-btn" onClick={() => setShowRequestsModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ overflowY: 'auto', paddingRight: 4 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>收到的申请</div>
                                {friendRequests.length === 0 && (
                                    <div style={{ color: '#718096', fontSize: 14, padding: '8px 4px 14px' }}>
                                        暂无待处理好友申请
                                    </div>
                                )}
                                {friendRequests.map((request) => {
                                    const sender = request.sender;
                                    if (!sender) return null;
                                    return (
                                        <div key={request.id} style={{ border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, padding: 12, marginBottom: 10, background: 'rgba(255,255,255,0.65)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                <div className="avatar" style={{ width: 40, height: 40, borderRadius: 12, fontSize: 14, background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }}>
                                                    {sender.avatar ? (
                                                        <img src={sender.avatar} alt={sender.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                                                    ) : (
                                                        sender.displayName?.slice(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, color: '#2d3748', fontSize: 14 }}>{sender.displayName}</div>
                                                    <div style={{ color: '#718096', fontSize: 12 }}>@{sender.username}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="primary-btn" style={{ marginTop: 0, padding: '10px 12px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => onHandleFriendRequest(request.id, 'accept')}>
                                                    <UserCheck size={15} /> 接受
                                                </button>
                                                <button className="icon-btn" style={{ border: '1px solid rgba(148,163,184,0.35)', borderRadius: 10, padding: '10px 12px', color: '#475569', fontWeight: 600 }} onClick={() => onHandleFriendRequest(request.id, 'reject')}>
                                                    拒绝
                                                </button>
                                                <button className="icon-btn danger" style={{ border: '1px solid rgba(248,113,113,0.35)', borderRadius: 10, padding: '10px 12px', fontWeight: 600 }} onClick={() => onHandleFriendRequest(request.id, 'block')}>
                                                    <Ban size={14} /> 拉黑
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 8px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>我发出的申请</div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            className="icon-btn"
                                            style={{
                                                border: '1px solid rgba(148,163,184,0.35)',
                                                borderRadius: 999,
                                                padding: '4px 10px',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: sentRequestFilter === 'all' ? '#2563eb' : '#64748b',
                                                background: sentRequestFilter === 'all' ? 'rgba(96,165,250,0.15)' : 'transparent'
                                            }}
                                            onClick={() => setSentRequestFilter('all')}
                                        >
                                            全部
                                        </button>
                                        <button
                                            className="icon-btn"
                                            style={{
                                                border: '1px solid rgba(148,163,184,0.35)',
                                                borderRadius: 999,
                                                padding: '4px 10px',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: sentRequestFilter === 'pending' ? '#2563eb' : '#64748b',
                                                background: sentRequestFilter === 'pending' ? 'rgba(96,165,250,0.15)' : 'transparent'
                                            }}
                                            onClick={() => setSentRequestFilter('pending')}
                                        >
                                            仅待处理
                                        </button>
                                    </div>
                                </div>
                                {filteredSentFriendRequests.length === 0 && (
                                    <div style={{ color: '#718096', fontSize: 14, padding: '8px 4px' }}>
                                        {sentRequestFilter === 'pending' ? '暂无待处理申请' : '暂无已发送申请'}
                                    </div>
                                )}
                                {filteredSentFriendRequests.map((request) => {
                                    const recipient = request.recipient;
                                    if (!recipient) return null;
                                    const statusInfo = getRequestStatusText(request.status);
                                    return (
                                        <div key={request.id} style={{ border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, padding: 12, marginBottom: 10, background: 'rgba(255,255,255,0.65)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="avatar" style={{ width: 40, height: 40, borderRadius: 12, fontSize: 14, background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }}>
                                                    {recipient.avatar ? (
                                                        <img src={recipient.avatar} alt={recipient.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                                                    ) : (
                                                        recipient.displayName?.slice(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, color: '#2d3748', fontSize: 14 }}>{recipient.displayName}</div>
                                                    <div style={{ color: '#718096', fontSize: 12 }}>@{recipient.username}</div>
                                                </div>
                                                <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: statusInfo.color, background: statusInfo.bg }}>
                                                    {statusInfo.text}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. 编辑自己资料 Modal */}
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
                                        {profileForm.avatar && !profileForm.avatar.includes('ui-avatars.com') ? (<img src={profileForm.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : (<div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'white', fontWeight: 'bold' }}>{profileForm.displayName?.slice(0, 2).toUpperCase()}</div>)}
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }} className="group-hover:opacity-100"><Camera color="white" /></div>
                                    </div>
                                    <div><p style={{ fontSize: 14, fontWeight: 600, color: '#4a5568', marginBottom: 8 }}>个人头像</p><button onClick={generateRandomAvatar} style={{ fontSize: 12, color: '#4facfe', background: '#ebf8ff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>随机头像</button></div>
                                </div>
                                <div><label style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>个人账号</label><div style={{ position: 'relative' }}><input className="input-field" style={{ paddingLeft: 40, backgroundColor: '#f7fafc', color: '#718096', cursor: 'not-allowed' }} value={user.username} disabled readOnly /><div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}><UserIcon size={18} /></div><div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#cbd5e0' }}><Lock size={16} /></div></div></div>
                                <div><label style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>显示名称</label><div style={{ position: 'relative' }}><input className="input-field" style={{ paddingLeft: 40 }} value={profileForm.displayName} onChange={e => setProfileForm({...profileForm, displayName: e.target.value})} placeholder="昵称" /><div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}><UserIcon size={18} /></div></div></div>
                                <div><label style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>新密码 <span style={{ fontWeight: 400, color: '#cbd5e0', textTransform: 'none' }}>(选填)</span></label><div style={{ position: 'relative' }}><input className="input-field" type="password" style={{ paddingLeft: 40 }} value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} placeholder="输入新密码" /><div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}><Lock size={18} /></div></div></div>
                                <div><label style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>确认密码 <span style={{ fontWeight: 400, color: '#cbd5e0', textTransform: 'none' }}>(如修改密码请填写)</span></label><div style={{ position: 'relative' }}><input className="input-field" type="password" style={{ paddingLeft: 40 }} value={profileForm.confirmPassword} onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})} placeholder="再次输入新密码" /><div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}><CheckCircle size={18} /></div></div></div>
                            </div>
                            <button className="primary-btn" onClick={handleUpdateProfile} disabled={loading} style={{ marginTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{loading ? '保存中...' : <><Save size={18}/> 保存修改</>}</button>
                        </div>
                    </div>
                )}

                {/* 3. [新增] 查看好友详情 Modal */}
                {viewingUser && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ width: 380, paddingBottom: 30 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#2d3748', margin: 0 }}>好友资料</h3>
                                <button className="icon-btn" onClick={() => setViewingUser(null)}><X size={20} /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15 }}>
                                <div
                                    style={{ width: 100, height: 100, borderRadius: 30, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}
                                    onClick={() => viewingUser.avatar && setPreviewImage(viewingUser.avatar)}
                                    title="点击查看大图"
                                >
                                    {viewingUser.avatar ? (
                                        <img src={viewingUser.avatar} alt={viewingUser.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'white', fontWeight: 'bold' }}>
                                            {viewingUser.displayName?.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#2d3748', margin: 0 }}>{viewingUser.displayName}</h2>
                                    <p style={{ color: '#718096', marginTop: 5, fontSize: 14 }}>@{viewingUser.username}</p>
                                </div>

                                {/* 如果是私聊界面，且不是自己，显示发消息按钮（虽然已经在聊天了，但逻辑完整） */}
                                {/* <button className="primary-btn" onClick={() => { setViewingUser(null); }} style={{ width: '80%', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <MessageSquare size={18}/> 发消息
                                </button> */}
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. [新增] 头像大图预览 Modal */}
                {previewImage && (
                    <div className="avatar-preview-overlay" onClick={() => setPreviewImage(null)}>
                        <img src={previewImage} alt="Full Preview" className="avatar-preview-img" onClick={(e) => e.stopPropagation()} />
                        <button
                            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: 10, cursor: 'pointer', color: 'white' }}
                            onClick={() => setPreviewImage(null)}
                        >
                            <X size={24} />
                        </button>
                    </div>
                )}

                <div className="window-controls"><div className="window-dot close"></div><div className="window-dot minimize"></div><div className="window-dot maximize"></div></div>

                <div className="chat-layout">
                    <div className="sidebar">
                        <div className="sidebar-header">
                            <h3>Messages</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button onClick={openFriendRequests} className="icon-btn" title="好友申请" style={{ position: 'relative' }}>
                                    <UserCheck size={18} />
                                    {friendRequests.length > 0 && (
                                        <span style={{ position: 'absolute', right: 2, top: 2, minWidth: 14, height: 14, borderRadius: 7, background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                                            {friendRequests.length > 99 ? '99+' : friendRequests.length}
                                        </span>
                                    )}
                                </button>
                                <button onClick={() => setShowAddModal(true)} className="icon-btn" title="添加好友"><UserPlus size={20} /></button>
                            </div>
                        </div>
                        <div style={{ padding: '0 25px 15px' }}><div style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} /><input type="text" placeholder="搜索联系人..." style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.5)', fontSize: 14, outline: 'none' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>

                        <div className="contact-list">
                            <div style={{ padding: '0 14px 8px' }}>
                                <div className="contact-section-header-row">
                                    <div
                                        className="contact-section-label-wrap contact-section-toggle"
                                        onClick={() => setIsPigsailExpanded(prev => !prev)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setIsPigsailExpanded(prev => !prev);
                                            }
                                        }}
                                    >
                                        <ChevronLeft
                                            size={12}
                                            style={{
                                                color: '#94a3b8',
                                                transform: isPigsailExpanded ? 'rotate(-90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s ease'
                                            }}
                                        />
                                        <div className="contact-section-title">
                                            PigSail和他的朋友们
                                        </div>
                                        <div className="contact-section-line" />
                                    </div>
                                    <button
                                        className="icon-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCreatePigsailChat();
                                        }}
                                        title="开启新对话"
                                        disabled={loading}
                                        style={{ opacity: loading ? 0.5 : 1 }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                {isPigsailExpanded && pigsailChats.length === 0 && (
                                    <div style={{ fontSize: 12, color: '#a0aec0', padding: '2px 0 8px' }}>
                                        还没有 PigSail 对话
                                    </div>
                                )}
                            </div>

                            {isPigsailExpanded && pigsailChats.map(chat => {
                                let info: any = {};
                                let unreadCount = 0;
                                if (chat.unreadCounts instanceof Map) { unreadCount = chat.unreadCounts.get(user?.id || '') || 0; }

                                if (chat.type === 'private') {
                                    const pid = chat.participants.find(id => id !== user.id);
                                    const otherUser = pid ? getUserInfo(pid) : null;
                                    const isPigsail = (otherUser?.username || '').toLowerCase() === 'pigsail' || (otherUser?.displayName || '').toLowerCase() === 'pigsail';
                                    const name = isPigsail
                                        ? (chat.name || otherUser?.displayName || 'PigSail')
                                        : (otherUser ? (otherUser.displayName || otherUser.username) : (pid ? `User ${pid.slice(0,6)}` : 'Unknown'));
                                    const online = onlineUsers.some(u => u.id === pid);

                                    info = {
                                        userId: pid, // 记录 ID 以便点击
                                        name,
                                        avatar: otherUser?.avatar ? null : name.slice(0,2).toUpperCase(),
                                        avatarUrl: otherUser?.avatar || null,
                                        color: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                                        online
                                    };
                                } else {
                                    info = { name: chat.name, avatar: chat.name?.slice(0,2).toUpperCase(), avatarUrl: null, color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', online: true };
                                }

                                return (
                                    <div key={chat.id} className={`contact-item ${currentChat?.id===chat.id?'active':''}`}
                                         onClick={(e)=>{
                                             setCurrentChat(chat);
                                             setMobileShowChat(true);
                                         }}
                                    >
                                        <div className="relative-avatar-container" onClick={(e) => {
                                            // [修改] 点击侧边栏头像 -> 查看用户资料
                                            e.stopPropagation();
                                            if(info.userId) handleViewUser(info.userId);
                                        }}>
                                            <div className="avatar" style={{ background: info.color }}>
                                                {info.avatarUrl ? (<img src={info.avatarUrl} alt={info.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}/>) : (info.avatar)}
                                            </div>
                                            {info.online && <div className="status-indicator status-online" />}
                                        </div>
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                <div style={{fontWeight:700,fontSize:15,color:'#2d3748'}}>{info.name}</div>
                                                {unreadCount > 0 && (
                                                    <div style={{ background: '#ff5f57', color: 'white', fontSize: 11, fontWeight: 'bold', minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{fontSize:13,color:'#718096',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{chat.lastMessage?.content || '开始聊天吧'}</div>
                                        </div>
                                        {chat.type === 'private' && info.userId && (
                                            <div className="contact-action-menu" style={{ position: 'relative' }}>
                                                <button
                                                    className="icon-btn"
                                                    style={{ width: 28, height: 28 }}
                                                    title="联系人操作"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveContactMenuChatId(prev => prev === chat.id ? null : chat.id);
                                                    }}
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>
                                                {activeContactMenuChatId === chat.id && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: 34,
                                                            right: 0,
                                                            background: 'white',
                                                            borderRadius: 10,
                                                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                            border: '1px solid rgba(148,163,184,0.2)',
                                                            zIndex: 20,
                                                            minWidth: 130,
                                                            overflow: 'hidden'
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            className="icon-btn"
                                                            style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, gap: 8, padding: '8px 10px', color: '#334155' }}
                                                            onClick={() => handleClearConversation(chat.id)}
                                                        >
                                                            <Eraser size={14} />
                                                            清空对话
                                                        </button>
                                                        <button
                                                            className="icon-btn danger"
                                                            style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, gap: 8, padding: '8px 10px' }}
                                                            onClick={() => handleRemoveFriend(info.userId, info.name)}
                                                        >
                                                            <Trash2 size={14} />
                                                            删除好友
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {friendChats.length > 0 && (
                                <div style={{ padding: '0 14px 8px' }}>
                                    <div className="contact-section-header-row contact-section-header-row-plain">
                                        <div
                                            className="contact-section-label-wrap contact-section-toggle"
                                            onClick={() => setIsFriendExpanded(prev => !prev)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setIsFriendExpanded(prev => !prev);
                                                }
                                            }}
                                        >
                                            <ChevronLeft
                                                size={12}
                                                style={{
                                                    color: '#94a3b8',
                                                    transform: isFriendExpanded ? 'rotate(-90deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s ease'
                                                }}
                                            />
                                            <div className="contact-section-title">好友</div>
                                            <div className="contact-section-line" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isFriendExpanded && friendChats.map(chat => {
                                let info: any = {};
                                let unreadCount = 0;
                                if (chat.unreadCounts instanceof Map) { unreadCount = chat.unreadCounts.get(user?.id || '') || 0; }

                                if (chat.type === 'private') {
                                    const pid = chat.participants.find(id => id !== user.id);
                                    const otherUser = pid ? getUserInfo(pid) : null;
                                    const isPigsail = (otherUser?.username || '').toLowerCase() === 'pigsail' || (otherUser?.displayName || '').toLowerCase() === 'pigsail';
                                    const name = isPigsail
                                        ? (chat.name || otherUser?.displayName || 'PigSail')
                                        : (otherUser ? (otherUser.displayName || otherUser.username) : (pid ? `User ${pid.slice(0,6)}` : 'Unknown'));
                                    const online = onlineUsers.some(u => u.id === pid);

                                    info = {
                                        userId: pid,
                                        name,
                                        avatar: otherUser?.avatar ? null : name.slice(0,2).toUpperCase(),
                                        avatarUrl: otherUser?.avatar || null,
                                        color: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                                        online
                                    };
                                } else {
                                    info = { name: chat.name, avatar: chat.name?.slice(0,2).toUpperCase(), avatarUrl: null, color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', online: true };
                                }

                                return (
                                    <div key={chat.id} className={`contact-item ${currentChat?.id===chat.id?'active':''}`}
                                         onClick={(e)=>{
                                             setCurrentChat(chat);
                                             setMobileShowChat(true);
                                         }}
                                    >
                                        <div className="relative-avatar-container" onClick={(e) => {
                                            e.stopPropagation();
                                            if(info.userId) handleViewUser(info.userId);
                                        }}>
                                            <div className="avatar" style={{ background: info.color }}>
                                                {info.avatarUrl ? (<img src={info.avatarUrl} alt={info.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}/>) : (info.avatar)}
                                            </div>
                                            {info.online && <div className="status-indicator status-online" />}
                                        </div>
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                <div style={{fontWeight:700,fontSize:15,color:'#2d3748'}}>{info.name}</div>
                                                {unreadCount > 0 && (
                                                    <div style={{ background: '#ff5f57', color: 'white', fontSize: 11, fontWeight: 'bold', minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{fontSize:13,color:'#718096',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{chat.lastMessage?.content || '开始聊天吧'}</div>
                                        </div>
                                        {chat.type === 'private' && info.userId && (
                                            <div className="contact-action-menu" style={{ position: 'relative' }}>
                                                <button
                                                    className="icon-btn"
                                                    style={{ width: 28, height: 28 }}
                                                    title="联系人操作"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveContactMenuChatId(prev => prev === chat.id ? null : chat.id);
                                                    }}
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>
                                                {activeContactMenuChatId === chat.id && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: 34,
                                                            right: 0,
                                                            background: 'white',
                                                            borderRadius: 10,
                                                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                            border: '1px solid rgba(148,163,184,0.2)',
                                                            zIndex: 20,
                                                            minWidth: 130,
                                                            overflow: 'hidden'
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            className="icon-btn"
                                                            style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, gap: 8, padding: '8px 10px', color: '#334155' }}
                                                            onClick={() => handleClearConversation(chat.id)}
                                                        >
                                                            <Eraser size={14} />
                                                            清空对话
                                                        </button>
                                                        <button
                                                            className="icon-btn danger"
                                                            style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, gap: 8, padding: '8px 10px' }}
                                                            onClick={() => handleRemoveFriend(info.userId, info.name)}
                                                        >
                                                            <Trash2 size={14} />
                                                            删除好友
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {groupChats.length > 0 && (
                                <div style={{ padding: '8px 14px 8px' }}>
                                    <div
                                        className="contact-section-label-wrap contact-section-toggle"
                                        onClick={() => setIsGroupExpanded(prev => !prev)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setIsGroupExpanded(prev => !prev);
                                            }
                                        }}
                                    >
                                        <ChevronLeft
                                            size={12}
                                            style={{
                                                color: '#94a3b8',
                                                transform: isGroupExpanded ? 'rotate(-90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s ease'
                                            }}
                                        />
                                        <div className="contact-section-title">群组</div>
                                        <div className="contact-section-line" />
                                    </div>
                                </div>
                            )}

                            {isGroupExpanded && groupChats.map(chat => {
                                let info: any = {};
                                let unreadCount = 0;
                                if (chat.unreadCounts instanceof Map) { unreadCount = chat.unreadCounts.get(user?.id || '') || 0; }

                                info = {
                                    userId: null,
                                    name: chat.name,
                                    avatar: chat.name?.slice(0,2).toUpperCase(),
                                    avatarUrl: null,
                                    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                    online: true
                                };

                                return (
                                    <div key={chat.id} className={`contact-item ${currentChat?.id===chat.id?'active':''}`}
                                         onClick={(e)=>{
                                             setCurrentChat(chat);
                                             setMobileShowChat(true);
                                         }}
                                    >
                                        <div className="relative-avatar-container">
                                            <div className="avatar" style={{ background: info.color }}>
                                                {info.avatar}
                                            </div>
                                            {info.online && <div className="status-indicator status-online" />}
                                        </div>
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                <div style={{fontWeight:700,fontSize:15,color:'#2d3748'}}>{info.name}</div>
                                                {unreadCount > 0 && (
                                                    <div style={{ background: '#ff5f57', color: 'white', fontSize: 11, fontWeight: 'bold', minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{fontSize:13,color:'#718096',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{chat.lastMessage?.content || '开始聊天吧'}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowProfileModal(true)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }}>
                                    {user.avatar ? <img src={user.avatar} alt="me" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:14}}/> : user.displayName?.slice(0,2).toUpperCase()}
                                </div>
                                <div><div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748' }}>{user.displayName}</div><div style={{ fontSize: 11, color: '#48bb78' }}>● 在线</div></div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}><button className="icon-btn"><Settings size={16}/></button><button className="icon-btn danger" onClick={(e)=>{e.stopPropagation();handleLogout()}}><LogOut size={16}/></button></div>
                        </div>
                    </div>

                    <div className={`chat-area ${mobileShowChat ? 'active' : ''}`}>
                        {currentChat ? (
                            <>
                                <div className="chat-header">
                                    <button className="mobile-back" onClick={()=>setMobileShowChat(false)}><ChevronLeft/></button>
                                    <div className="relative-avatar-container"
                                         onClick={() => {
                                             // [修改] 点击顶部头像 -> 查看用户资料
                                             if (currentChatInfo?.userId) handleViewUser(currentChatInfo.userId);
                                         }}
                                         style={{ cursor: 'pointer' }}
                                    >
                                        <div className="avatar" style={{width:52,height:52,fontSize:18,background:currentChatInfo?.color}}>
                                            {currentChatInfo?.avatarUrl ? (<img src={currentChatInfo.avatarUrl} alt={currentChatInfo.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}/>) : (currentChatInfo?.avatar)}
                                        </div>
                                        {!currentChatInfo?.isGroup && currentChatInfo?.isOnline && ( <div className="status-indicator status-online" /> )}
                                    </div>
                                    <div>
                                        <h3 style={{fontSize:16,fontWeight:700,color:'#2d3748', cursor: 'pointer'}} onClick={() => {
                                            if (currentChatInfo?.userId) handleViewUser(currentChatInfo.userId);
                                        }}>{currentChatInfo?.name}</h3>
                                        <div style={{fontSize:12,color:currentChatInfo?.isOnline?'#48bb78':'#a0aec0'}}>{currentChatInfo?.isOnline?'在线':'离线'}</div>
                                    </div>
                                </div>

                                <div className="chat-messages" id="messageArea">
                                    {Object.entries(messageGroups).map(([date, dateMessages]) => (
                                        <React.Fragment key={date}>
                                            <div className="date-separator-container">
                                                <div className="date-separator">
                                                    {date}
                                                </div>
                                            </div>
                                            {dateMessages.map((message) => {
                                                const isOwn = isOwnMessage(message);
                                                let senderAvatar: string | undefined;
                                                let senderName = currentChatInfo?.name || 'Unknown';

                                                if (isOwn) {
                                                    senderAvatar = user?.avatar || undefined;
                                                    senderName = user?.displayName || 'Me';
                                                } else if (currentChat.type === 'group') {
                                                    const sender = getUserInfo(message.senderId);
                                                    if (sender) {
                                                        senderAvatar = sender.avatar || undefined;
                                                        senderName = sender.displayName;
                                                    }
                                                } else {
                                                    senderAvatar = currentChatInfo?.avatarUrl || undefined;
                                                    senderName = currentChatInfo?.name || 'User';
                                                }

                                                const displayAvatar = senderAvatar;

                                                return (
                                                    <div
                                                        key={message.id}
                                                        className={`message ${isOwn ? 'sent' : ''} ${message.type === 'system' ? 'system-message-row' : ''}`}
                                                    >
                                                        {message.type === 'system' ? (
                                                            <div className="system-message-wrap">
                                                                <div className="system-message-pill">
                                                                    <Sparkles size={13} />
                                                                    <span>{message.content}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* [修改] 点击消息头像 -> 查看用户资料 */}
                                                                <div className="message-avatar" title={senderName} onClick={() => handleViewUser(message.senderId)}>
                                                                    {displayAvatar ? (
                                                                        <img src={displayAvatar} alt={senderName} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                                                                    ) : (
                                                                        senderName.charAt(0).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <div className="message-content">
                                                                    {currentChat.type === 'group' && !isOwn && (
                                                                        <div className="message-sender-name">{senderName}</div>
                                                                    )}
                                                                    <p style={{ margin: 0 }}>{message.content}</p>
                                                                    <span className="message-time">{formatTimeShort(new Date(message.timestamp))}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}

                                    {currentTypingUsers.length > 0 && (
                                        <div className="message">
                                            <div className="message-avatar">...</div>
                                            <div className="message-content" style={{display: 'flex', alignItems: 'center', gap: 4, minHeight: 40}}>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef}/>
                                </div>

                                <div className="chat-input-container">
                                    {showEmojiPicker && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 80,
                                            left: 20,
                                            background: 'rgba(255,255,255,0.9)',
                                            backdropFilter: 'blur(10px)',
                                            padding: 10,
                                            borderRadius: 16,
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                            zIndex: 50,
                                            width: '450px'
                                        }} ref={emojiPickerRef}>
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto', paddingBottom: 5 }} className="scrollbar-hide">
                                                {EMOJI_CATEGORIES.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setActiveEmojiCategory(cat.id)}
                                                        style={{
                                                            padding: '4px 12px',
                                                            borderRadius: '20px',
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            backgroundColor: activeEmojiCategory === cat.id ? '#34d399' : '#f3f4f6',
                                                            color: activeEmojiCategory === cat.id ? 'white' : '#4b5563',
                                                            whiteSpace: 'nowrap',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(8, 1fr)',
                                                gap: 6,
                                                maxHeight: '200px',
                                                overflowY: 'auto'
                                            }}>
                                                {EMOJI_CATEGORIES.find(c => c.id === activeEmojiCategory)?.list.map((emoji, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleEmojiSelect(emoji)}
                                                        style={{
                                                            fontSize: 22,
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: 4,
                                                            borderRadius: 6,
                                                            transition: '0.2s'
                                                        }}
                                                        className="hover:bg-gray-100"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <input ref={inputRef} className="chat-input" placeholder="说点什么..." value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSendMessage()}/>
                                    <button className="icon-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} ref={emojiBtnRef}><Smile size={20}/></button>
                                    <button className="send-btn" onClick={handleSendMessage} disabled={!inputText.trim()}><Send size={20}/></button>
                                </div>
                            </>
                        ) : (<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#a0aec0',flexDirection:'column',gap:10}}><img src="/logo192.png" width="64" style={{opacity:0.5}} alt=""/><p>选择一个聊天开始对话</p></div>)}
                    </div>
                </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
        </div>
    );
}

export default App;