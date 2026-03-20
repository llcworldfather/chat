import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { socketService } from '../services/socket';
import { apiService } from '../services/api';
import {
    ChatContextType,
    User,
    Chat,
    Message,
    SocketUser,
    TypingUser,
    CreateGroupData,
    RegisterRequest,
    FriendRequest
} from '../types';

interface ChatState {
    user: User | null;
    token: string | null;
    currentUser: SocketUser | null;
    chats: Chat[];
    currentChat: Chat | null;
    messages: Message[];
    onlineUsers: SocketUser[];
    typingUsers: TypingUser[];
    isConnected: boolean;
    loading: boolean;
    error: string | null;
    userCache: Map<string, User>;
    friendRequests: FriendRequest[];
    sentFriendRequests: FriendRequest[];
}

type ChatAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_USER'; payload: { user: User; token: string } }
    | { type: 'CLEAR_USER' }
    | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
    | { type: 'SET_CURRENT_USER'; payload: SocketUser }
    | { type: 'SET_CHATS'; payload: Chat[] }
    | { type: 'ADD_CHAT'; payload: Chat }
    | { type: 'UPDATE_CHAT'; payload: Chat }
    | { type: 'SET_CURRENT_CHAT'; payload: Chat | null }
    | { type: 'SET_MESSAGES'; payload: Message[] }
    | { type: 'ADD_MESSAGE'; payload: Message }
    | { type: 'UPDATE_MESSAGE'; payload: Message }
    | { type: 'SET_ONLINE_USERS'; payload: SocketUser[] }
    | { type: 'UPDATE_USER_STATUS'; payload: { userId: string; status: string } }
    | { type: 'UPDATE_ONLINE_USER'; payload: SocketUser }
    | { type: 'SET_TYPING_USERS'; payload: TypingUser[] }
    | { type: 'MARK_MESSAGES_READ'; payload: { chatId: string; userId: string } }
    | { type: 'USER_LEFT_GROUP'; payload: { chatId: string; userId: string } }
    | { type: 'REMOVE_CHAT'; payload: string }
    | { type: 'FRIEND_REMOVED'; payload: { chatId: string } }
    | { type: 'CHAT_CLEARED'; payload: { chatId: string; clearedBy?: string } }
    | { type: 'CLEAR_CURRENT_CHAT_UNREAD' }
    | { type: 'CACHE_USERS'; payload: User[] }
    | { type: 'AI_STREAM_START'; payload: Message }
    | { type: 'AI_STREAM_CHUNK'; payload: { messageId: string; chunk: string } }
    | { type: 'AI_STREAM_END'; payload: Message }
    | { type: 'SET_FRIEND_REQUESTS'; payload: FriendRequest[] }
    | { type: 'ADD_FRIEND_REQUEST'; payload: FriendRequest }
    | { type: 'REMOVE_FRIEND_REQUEST'; payload: string }
    | { type: 'SET_SENT_FRIEND_REQUESTS'; payload: FriendRequest[] }
    | { type: 'ADD_SENT_FRIEND_REQUEST'; payload: FriendRequest }
    | { type: 'UPDATE_SENT_FRIEND_REQUEST_STATUS'; payload: { requestId: string; status: 'accepted' | 'rejected' | 'blocked' } };

const parseChat = (chat: any): Chat => {
    return {
        ...chat,
        unreadCounts: new Map(Object.entries(chat.unreadCounts || {}))
    };
};

const normalizeMessage = (message: Message): Message => ({
    ...message,
    reactions: message.reactions || {}
});

const loadCache = (): Map<string, User> => {
    try {
        const saved = localStorage.getItem('chat_user_cache');
        if (saved) return new Map(JSON.parse(saved));
    } catch (e) {}
    return new Map();
};

const initialState: ChatState = {
    user: null,
    token: null,
    currentUser: null,
    chats: [],
    currentChat: null,
    messages: [],
    onlineUsers: [],
    typingUsers: [],
    isConnected: false,
    loading: false,
    error: null,
    userCache: loadCache(),
    friendRequests: [],
    sentFriendRequests: []
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
        case 'SET_USER':
            if (!action.payload.user || !action.payload.user.id) {
                console.error('SET_USER: Invalid user object received:', action.payload.user);
                return state;
            }
            console.log('SET_USER: Setting user with ID:', action.payload.user.id, 'User:', action.payload.user);
            return { ...state, user: action.payload.user, token: action.payload.token, loading: false, error: null };
        case 'CLEAR_USER': return { ...initialState, user: null, token: null, currentUser: null, userCache: state.userCache };
        case 'SET_CONNECTION_STATUS': return { ...state, isConnected: action.payload };
        case 'SET_CURRENT_USER': return { ...state, currentUser: action.payload };
        case 'SET_CHATS': return { ...state, chats: action.payload.map((chat: any) => parseChat(chat)) };
        case 'ADD_CHAT':
            const newChat = action.payload;
            if (state.chats.some(c => c.id === newChat.id)) return state;
            return { ...state, chats: [newChat, ...state.chats] };
        case 'UPDATE_CHAT': {
            const updatedChat = action.payload;
            const exists = state.chats.some(c => c.id === updatedChat.id);
            const chats = exists
                ? state.chats.map(c => c.id === updatedChat.id ? updatedChat : c)
                : [updatedChat, ...state.chats];
            const currentChat = state.currentChat?.id === updatedChat.id ? updatedChat : state.currentChat;
            return { ...state, chats, currentChat };
        }
        case 'SET_CURRENT_CHAT': return { ...state, currentChat: action.payload, messages: [] };
        case 'SET_MESSAGES':
            return { ...state, messages: action.payload.map(normalizeMessage) };
        case 'ADD_MESSAGE': {
            const newMessage = normalizeMessage(action.payload);

            // [修改] 增加去重逻辑
            if (state.messages.some(msg => msg.id === newMessage.id)) {
                return state;
            }

            const userId = state.user?.id;
            const isCurrentChat = state.currentChat?.id === newMessage.chatId;
            const targetChatIndex = state.chats.findIndex(c => c.id === newMessage.chatId);
            let newChats = [...state.chats];
            let targetChat = targetChatIndex !== -1 ? { ...newChats[targetChatIndex] } : null;
            if (targetChat) {
                targetChat.lastMessage = newMessage;
                if (!isCurrentChat && userId && String(newMessage.senderId) !== String(userId)) {
                    const unreadCounts = new Map(targetChat.unreadCounts);
                    const currentCount = unreadCounts.get(userId) || 0;
                    unreadCounts.set(userId, currentCount + 1);
                    targetChat.unreadCounts = unreadCounts;
                }
                newChats.splice(targetChatIndex, 1);
                newChats.unshift(targetChat);
            }
            return {
                ...state,
                chats: newChats,
                messages: isCurrentChat ? [...state.messages, newMessage] : state.messages,
            };
        }
        case 'UPDATE_MESSAGE': {
            const updatedMessage = normalizeMessage(action.payload);
            const hasMessage = state.messages.some(msg => msg.id === updatedMessage.id);
            if (!hasMessage) return state;

            return {
                ...state,
                messages: state.messages.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
            };
        }
        case 'SET_ONLINE_USERS': return { ...state, onlineUsers: action.payload };
        case 'UPDATE_USER_STATUS':
            const { userId: statusUserId, status: userStatus } = action.payload;
            const usersWithStatus = state.onlineUsers.map(user =>
                user.id === statusUserId ? { ...user, status: userStatus as 'online' | 'away' } : user
            );
            return { ...state, onlineUsers: usersWithStatus };
        case 'UPDATE_ONLINE_USER':
            const updatedOnlineUsers = state.onlineUsers.map(user =>
                user.id === action.payload.id ? { ...user, ...action.payload } : user
            );
            return { ...state, onlineUsers: updatedOnlineUsers };
        case 'SET_TYPING_USERS': return { ...state, typingUsers: action.payload };
        case 'MARK_MESSAGES_READ': {
            const { chatId: readChatId, userId: readUserId } = action.payload;
            const messagesWithRead = state.messages.map(msg =>
                msg.chatId === readChatId ? { ...msg, readBy: Array.from(new Set([...msg.readBy, readUserId])) } : msg
            );
            const chatsAfterRead = state.chats.map(chat => {
                if (chat.id === readChatId) {
                    const unreadCounts = chat.unreadCounts instanceof Map ? new Map(chat.unreadCounts) : new Map();
                    unreadCounts.set(readUserId, 0);
                    return { ...chat, unreadCounts };
                }
                return chat;
            });
            return { ...state, messages: messagesWithRead, chats: chatsAfterRead };
        }
        case 'CLEAR_CURRENT_CHAT_UNREAD': {
            if (!state.currentChat || !state.user) return state;
            const chatId = state.currentChat.id;
            const userId = state.user.id;
            const chatsCleared = state.chats.map(chat => {
                if (chat.id === chatId) {
                    const unreadCounts = chat.unreadCounts instanceof Map ? new Map(chat.unreadCounts) : new Map();
                    unreadCounts.set(userId, 0);
                    return { ...chat, unreadCounts };
                }
                return chat;
            });
            return { ...state, chats: chatsCleared };
        }
        case 'USER_LEFT_GROUP':
            const { chatId: leftChatId, userId: leftUserId } = action.payload;
            const updatedChatsAfterLeave = state.chats.map(chat =>
                chat.id === leftChatId ? { ...chat, participants: chat.participants.filter(id => id !== leftUserId) } : chat
            );
            return {
                ...state,
                chats: updatedChatsAfterLeave,
                currentChat: state.currentChat?.id === leftChatId
                    ? (
                        state.user?.id === leftUserId
                            ? null
                            : { ...state.currentChat, participants: state.currentChat.participants.filter(id => id !== leftUserId) }
                    )
                    : state.currentChat
            };
        case 'REMOVE_CHAT': {
            const filteredChats = state.chats.filter(chat => chat.id !== action.payload);
            const removedCurrent = state.currentChat?.id === action.payload;
            return {
                ...state,
                chats: filteredChats,
                currentChat: removedCurrent ? null : state.currentChat,
                messages: removedCurrent ? [] : state.messages
            };
        }
        case 'FRIEND_REMOVED': {
            const filteredChats = state.chats.filter(chat => chat.id !== action.payload.chatId);
            const removedCurrent = state.currentChat?.id === action.payload.chatId;
            return {
                ...state,
                chats: filteredChats,
                currentChat: removedCurrent ? null : state.currentChat,
                messages: removedCurrent ? [] : state.messages
            };
        }
        case 'CHAT_CLEARED': {
            const targetChatId = action.payload.chatId;
            const chatsAfterClear = state.chats.map(chat => {
                if (chat.id !== targetChatId) return chat;
                const unreadCounts = new Map(chat.unreadCounts || []);
                unreadCounts.forEach((_, key) => unreadCounts.set(key, 0));
                return { ...chat, lastMessage: undefined, unreadCounts };
            });
            const currentChat = state.currentChat?.id === targetChatId
                ? { ...state.currentChat, lastMessage: undefined }
                : state.currentChat;
            return {
                ...state,
                chats: chatsAfterClear,
                currentChat,
                messages: state.currentChat?.id === targetChatId ? [] : state.messages
            };
        }

        case 'CACHE_USERS': {
            const newCache = new Map(state.userCache);
            let hasChanges = false;
            action.payload.forEach(u => {
                if (u && u.id) {
                    const existing = newCache.get(u.id);
                    if (!existing || (u.avatar && u.avatar !== existing.avatar) || u.displayName !== existing.displayName) {
                        newCache.set(u.id, u);
                        hasChanges = true;
                    }
                }
            });
            if (!hasChanges) return state;
            localStorage.setItem('chat_user_cache', JSON.stringify(Array.from(newCache.entries())));
            return { ...state, userCache: newCache };
        }
        case 'AI_STREAM_START': {
            const placeholder = { ...normalizeMessage(action.payload), isStreaming: true };
            const isCurrentChat = state.currentChat?.id === placeholder.chatId;
            if (!isCurrentChat) return state;
            // Avoid duplicate if somehow the event fires twice
            if (state.messages.some(m => m.id === placeholder.id)) return state;
            return { ...state, messages: [...state.messages, placeholder] };
        }
        case 'AI_STREAM_CHUNK': {
            const { messageId, chunk } = action.payload;
            const updated = state.messages.map(m =>
                m.id === messageId ? { ...m, content: m.content + chunk } : m
            );
            return { ...state, messages: updated };
        }
        case 'AI_STREAM_END': {
            const finalMsg = normalizeMessage(action.payload);
            // Replace streaming placeholder with the finalized message
            const finalized = state.messages.map(m =>
                m.id === finalMsg.id ? { ...finalMsg, isStreaming: false } : m
            );
            // Update chat list's lastMessage
            const chatsUpdated = state.chats.map(chat =>
                chat.id === finalMsg.chatId ? { ...chat, lastMessage: finalMsg } : chat
            );
            return { ...state, messages: finalized, chats: chatsUpdated };
        }
        case 'SET_FRIEND_REQUESTS':
            return { ...state, friendRequests: action.payload };
        case 'ADD_FRIEND_REQUEST':
            if (state.friendRequests.some(r => r.id === action.payload.id)) return state;
            return { ...state, friendRequests: [action.payload, ...state.friendRequests] };
        case 'REMOVE_FRIEND_REQUEST':
            return { ...state, friendRequests: state.friendRequests.filter(r => r.id !== action.payload) };
        case 'SET_SENT_FRIEND_REQUESTS':
            return { ...state, sentFriendRequests: action.payload };
        case 'ADD_SENT_FRIEND_REQUEST':
            if (state.sentFriendRequests.some(r => r.id === action.payload.id)) return state;
            return { ...state, sentFriendRequests: [action.payload, ...state.sentFriendRequests] };
        case 'UPDATE_SENT_FRIEND_REQUEST_STATUS':
            return {
                ...state,
                sentFriendRequests: state.sentFriendRequests.map((request) =>
                    request.id === action.payload.requestId
                        ? {
                            ...request,
                            status: action.payload.status,
                            updatedAt: new Date(),
                            respondedAt: new Date()
                        }
                        : request
                )
            };
        default: return state;
    }
}

export interface ChatContextTypeExtended extends ChatContextType {
    userCache: Map<string, User>;
    getUserInfo: (userId: string) => User | SocketUser | undefined;
    setCurrentChat: (chat: Chat | null, options?: { aroundMessageId?: string }) => void;
}

const ChatContext = createContext<ChatContextTypeExtended | undefined>(undefined);

interface ChatProviderProps { children: ReactNode; }

export function ChatProvider({ children }: ChatProviderProps) {
    const [state, dispatch] = useReducer(chatReducer, initialState);
    const fetchingIds = useRef<Set<string>>(new Set());

    const getUserInfo = (userId: string) => {
        if (userId === 'system') {
            return {
                id: 'system',
                username: 'system',
                displayName: 'System',
                avatar: undefined,
                status: 'offline' as const,
                lastSeen: new Date(),
                joinedAt: new Date()
            } as User;
        }
        if (state.user?.id === userId) return state.user;
        const onlineUser = state.onlineUsers.find(u => u.id === userId);
        if (onlineUser) return onlineUser;
        return state.userCache.get(userId);
    };

    const clearError = () => {
        dispatch({ type: 'SET_ERROR', payload: null });
    };

    useEffect(() => {
        const loadMissingUsers = async () => {
            if (!state.user) return;
            const hasUserInfo = (userId: string) => {
                if (userId === 'system') return true;
                if (state.user?.id === userId) return true;
                if (state.onlineUsers.some(u => u.id === userId)) return true;
                return state.userCache.has(userId);
            };
            const idsToFetch = new Set<string>();
            state.chats.forEach(chat => {
                if (chat.type === 'private') {
                    const pid = chat.participants.find(id => id !== state.user?.id);
                    if (pid && !hasUserInfo(pid)) idsToFetch.add(pid);
                }
            });
            state.messages.forEach(msg => {
                if (!hasUserInfo(msg.senderId)) idsToFetch.add(msg.senderId);
            });
            const realIds = Array.from(idsToFetch).filter(id => id !== 'system' && !fetchingIds.current.has(id));
            if (realIds.length === 0) return;
            realIds.forEach(id => fetchingIds.current.add(id));
            try {
                const users = await Promise.all(
                    realIds.map(id => apiService.getUserById(id).catch(() => null))
                );
                const validUsers = users.filter((u): u is User => !!u);
                if (validUsers.length > 0) {
                    dispatch({ type: 'CACHE_USERS', payload: validUsers });
                }
            } finally {
                realIds.forEach(id => fetchingIds.current.delete(id));
            }
        };
        const timer = setTimeout(loadMissingUsers, 500);
        return () => clearTimeout(timer);
    }, [state.chats, state.messages, state.onlineUsers, state.userCache, state.user]);

    useEffect(() => {
        if (state.onlineUsers.length > 0) {
            const usersToCache: User[] = state.onlineUsers.map(u => ({
                id: u.id,
                username: u.username,
                displayName: u.displayName,
                avatar: u.avatar,
                status: (u.status === 'online' || u.status === 'away') ? u.status : 'offline',
                email: '',
                lastSeen: new Date(),
                joinedAt: new Date()
            }));
            dispatch({ type: 'CACHE_USERS', payload: usersToCache });
        }
    }, [state.onlineUsers]);

    const setupSocketListeners = () => {
        socketService.onChatsLoaded((chats) => {
            dispatch({ type: 'SET_CHATS', payload: chats });
            const lastChatId = localStorage.getItem('lastActiveChatId');
            if (lastChatId) {
                const chatToRestore = chats.find((c: Chat) => c.id === lastChatId);
                if (chatToRestore) {
                    const parsedChat = parseChat(chatToRestore);
                    dispatch({ type: 'SET_CURRENT_CHAT', payload: parsedChat });
                    socketService.getChatMessages(parsedChat.id);
                }
            }
        });
        socketService.onOnlineUsers((users) => {
            dispatch({ type: 'SET_ONLINE_USERS', payload: users });
        });
        socketService.onUserStatusChanged((data) => dispatch({ type: 'UPDATE_USER_STATUS', payload: data }));
        socketService.onPrivateChatLoaded(({ chat, messages, recipient }) => {
            dispatch({ type: 'SET_CURRENT_CHAT', payload: parseChat(chat) });
            dispatch({ type: 'SET_MESSAGES', payload: messages });
            if (recipient) {
                dispatch({ type: 'CACHE_USERS', payload: [recipient] });
            }
        });
        socketService.onChatMessagesLoaded(({ chat, messages, recipient }) => {
            dispatch({ type: 'SET_CURRENT_CHAT', payload: parseChat(chat) });
            dispatch({ type: 'SET_MESSAGES', payload: messages });
            if (recipient) {
                dispatch({ type: 'CACHE_USERS', payload: [recipient] });
            }
        });
        socketService.onGroupCreated((chat) => dispatch({ type: 'ADD_CHAT', payload: parseChat(chat) }));
        socketService.onGroupCreatedSuccess((chat) => {
            const parsedChat = parseChat(chat);
            dispatch({ type: 'ADD_CHAT', payload: parsedChat });
            setCurrentChat(parsedChat);
        });
        socketService.onGroupProfileUpdated((chat) => {
            dispatch({ type: 'UPDATE_CHAT', payload: parseChat(chat) });
        });
        socketService.onNewMessage((message) => dispatch({ type: 'ADD_MESSAGE', payload: message }));
        socketService.onMessageReactionUpdated((message) => dispatch({ type: 'UPDATE_MESSAGE', payload: message }));
        socketService.onMessageDeleted((message) => dispatch({ type: 'UPDATE_MESSAGE', payload: message }));
        socketService.onMessagesRead((data) => dispatch({ type: 'MARK_MESSAGES_READ', payload: data }));
        socketService.onFriendAdded((data: any) => {
            const chatData = data.chat || data;
            const systemMsg = data.systemMessage || null;
            if (chatData) {
                const parsedChat = parseChat(chatData);
                dispatch({ type: 'ADD_CHAT', payload: parsedChat });
                if (systemMsg) dispatch({ type: 'ADD_MESSAGE', payload: systemMsg });
            }
        });
        socketService.onFriendRemoved((data) => {
            dispatch({ type: 'FRIEND_REMOVED', payload: { chatId: data.chatId } });
            if (localStorage.getItem('lastActiveChatId') === data.chatId) {
                localStorage.removeItem('lastActiveChatId');
            }
        });
        socketService.onFriendRequestsLoaded((requests) => {
            dispatch({ type: 'SET_FRIEND_REQUESTS', payload: requests || [] });
        });
        socketService.onFriendSentRequestsLoaded((requests) => {
            dispatch({ type: 'SET_SENT_FRIEND_REQUESTS', payload: requests || [] });
        });
        socketService.onFriendRequestReceived((request) => {
            dispatch({ type: 'ADD_FRIEND_REQUEST', payload: request });
        });
        socketService.onFriendRequestHandled((data) => {
            dispatch({
                type: 'UPDATE_SENT_FRIEND_REQUEST_STATUS',
                payload: { requestId: data.requestId, status: data.action }
            });
        });
        socketService.onChatCleared((data) => {
            dispatch({ type: 'CHAT_CLEARED', payload: data });
        });
        socketService.onUserTyping(({ chatId, user }) => {
            const existing = state.typingUsers.filter(u => !(u.chatId === chatId && u.userId === user.userId));
            dispatch({ type: 'SET_TYPING_USERS', payload: [...existing, { ...user, chatId }] });
        });
        socketService.onUserStopTyping(({ chatId, userId }) => {
            const filtered = state.typingUsers.filter(u => !(u.chatId === chatId && u.userId === userId));
            dispatch({ type: 'SET_TYPING_USERS', payload: filtered });
        });
        socketService.onUserLeftGroup((data) => dispatch({ type: 'USER_LEFT_GROUP', payload: data }));
        socketService.onLeftGroup(({ chatId }) => {
            if (state.currentChat?.id === chatId) setCurrentChat(null);
            dispatch({ type: 'REMOVE_CHAT', payload: chatId });
        });
        socketService.onError(({ message }) => dispatch({ type: 'SET_ERROR', payload: message }));
        socketService.onAiStreamStart(({ message }) => dispatch({ type: 'AI_STREAM_START', payload: message }));
        socketService.onAiStreamChunk((data) => dispatch({ type: 'AI_STREAM_CHUNK', payload: data }));
        socketService.onAiStreamEnd(({ message }) => dispatch({ type: 'AI_STREAM_END', payload: message }));
        socketService.onUserProfileUpdated((updatedUser) => {
            console.log('Received user_profile_updated event:', updatedUser);

            dispatch({ type: 'UPDATE_ONLINE_USER', payload: updatedUser });

            if (updatedUser.id !== state.user?.id) {
                const userToCache: User = {
                    id: updatedUser.id,
                    username: updatedUser.username,
                    displayName: updatedUser.displayName,
                    avatar: updatedUser.avatar,
                    status: (updatedUser.status === 'online' || updatedUser.status === 'away') ? updatedUser.status : 'offline',
                    email: '',
                    lastSeen: new Date(),
                    joinedAt: new Date()
                };
                dispatch({ type: 'CACHE_USERS', payload: [userToCache] });
                console.log('Cached other user data:', userToCache.displayName);
            } else {
                console.log('Skipping cache update for current user to avoid conflicts');
            }
        });
    };

    useEffect(() => {
        const initializeApp = async () => {
            if (state.user) return;
            const token = apiService.getToken();
            const cachedUser = apiService.getUser();

            console.log('=== INITIALIZATION DEBUG ===');
            console.log('Token found:', !!token);
            console.log('Cached user:', cachedUser);

            if (token && cachedUser) {
                if (!cachedUser.id) {
                    console.error('Cached user has no ID, clearing cache and forcing logout');
                    apiService.removeUser();
                    localStorage.removeItem('token');
                    return;
                }

                try {
                    const freshUserData = await apiService.getUserById(cachedUser.id);
                    console.log('Fresh user data from server:', freshUserData);

                    if (!freshUserData || !freshUserData.id) {
                        console.error('Invalid fresh user data received, using cached user');
                        dispatch({ type: 'SET_USER', payload: { user: cachedUser, token } });
                    } else {
                        dispatch({ type: 'SET_USER', payload: { user: freshUserData, token } });
                        apiService.setUser(freshUserData);
                    }
                } catch (error) {
                    console.error('Error fetching fresh user data, using cached:', error);
                    dispatch({ type: 'SET_USER', payload: { user: cachedUser, token } });
                }
                try {
                    socketService.initialize(token);
                    setupSocketListeners();
                    await socketService.connect();
                    dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
                    try {
                        const onlineUsers = await apiService.getOnlineUsers();
                        const socketUsers: SocketUser[] = onlineUsers.map(u => ({
                            id: u.id,
                            username: u.username,
                            displayName: u.displayName,
                            avatar: u.avatar,
                            status: (u.status === 'online' || u.status === 'away') ? u.status : 'online',
                            socketId: ''
                        }));
                        dispatch({ type: 'SET_ONLINE_USERS', payload: socketUsers });
                    } catch (e) {}
                } catch (error) {
                    dispatch({ type: 'SET_ERROR', payload: 'Failed to connect' });
                    apiService.clearAuth();
                    dispatch({ type: 'CLEAR_USER' });
                }
            }
        };
        initializeApp();
        return () => { socketService.disconnect(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    const login = async (username: string, password: string) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        try {
            const response = await apiService.login({ username, password });
            apiService.setToken(response.token);
            apiService.setUser(response.user);
            dispatch({ type: 'SET_USER', payload: { user: response.user, token: response.token } });
            try {
                socketService.initialize(response.token);
                setupSocketListeners();
                await socketService.connect();
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
            } catch (e) {}
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const register = async (userData: RegisterRequest) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        try {
            const response = await apiService.register(userData);
            apiService.setToken(response.token);
            apiService.setUser(response.user);
            dispatch({ type: 'SET_USER', payload: { user: response.user, token: response.token } });
            try {
                socketService.initialize(response.token);
                setupSocketListeners();
                await socketService.connect();
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
            } catch (e) {}
        } catch (error: any) {
            let msg = error instanceof Error ? error.message : 'Registration failed';
            if (msg.includes('409') || msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
                msg = '该账号已经被注册，换个账号吧';
            }
            dispatch({ type: 'SET_ERROR', payload: msg });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const logout = () => {
        socketService.disconnect();
        apiService.clearAuth();
        localStorage.removeItem('lastActiveChatId');
        dispatch({ type: 'CLEAR_USER' });
    };

    const setCurrentChat = (chat: Chat | null, options?: { aroundMessageId?: string }) => {
        console.log('[ChatContext] setCurrentChat 调用:', { chatId: chat?.id, aroundMessageId: options?.aroundMessageId });
        dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
        if (chat) {
            markMessagesAsRead(chat.id);
            dispatch({ type: 'CLEAR_CURRENT_CHAT_UNREAD' });
            localStorage.setItem('lastActiveChatId', chat.id);
            socketService.getChatMessages(chat.id, options?.aroundMessageId);
        } else {
            localStorage.removeItem('lastActiveChatId');
        }
    };

    const sendMessage = (chatId: string, content: string, type = 'text', replyToId?: string) => {
        if (content.trim()) socketService.sendMessage(chatId, content.trim(), type, replyToId);
    };

    const toggleMessageReaction = (chatId: string, messageId: string, emoji: string) => {
        socketService.toggleReaction(chatId, messageId, emoji);
    };

    const deleteMessage = (chatId: string, messageId: string) => {
        socketService.deleteMessage(chatId, messageId);
    };

    const markMessagesAsRead = (chatId: string) => socketService.markMessagesRead(chatId);
    const createGroup = (groupData: CreateGroupData) => socketService.createGroup(groupData);
    const addGroupMembers = async (chatId: string, memberIds: string[]) => {
        dispatch({ type: 'SET_ERROR', payload: null });
        await socketService.addGroupMembers(chatId, memberIds);
    };
    const removeGroupMember = async (chatId: string, memberId: string) => {
        dispatch({ type: 'SET_ERROR', payload: null });
        await socketService.removeGroupMember(chatId, memberId);
    };
    const updateGroupProfile = async (chatId: string, data: { name?: string; avatar?: string }) => {
        dispatch({ type: 'SET_ERROR', payload: null });
        await socketService.updateGroupProfile(chatId, data);
    };
    const getPrivateChat = (recipientId: string) => socketService.getPrivateChat(recipientId);
    const leaveGroup = (chatId: string) => socketService.leaveGroup(chatId);
    const typingStart = (chatId: string) => socketService.typingStart(chatId);
    const typingStop = (chatId: string) => socketService.typingStop(chatId);

    const addFriend = async (friendName: string) => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await socketService.addFriend(friendName);
            if (response?.alreadyFriends && response?.chat) {
                const parsedChat = parseChat(response.chat);
                dispatch({ type: 'ADD_CHAT', payload: parsedChat });
                return;
            }
            if (!response?.success) {
                throw new Error(response?.message || response?.error || '未找到该账号或添加失败');
            }
            if (response?.request) {
                dispatch({ type: 'ADD_SENT_FRIEND_REQUEST', payload: response.request });
            }
        } catch (error: any) {
            dispatch({ type: 'SET_ERROR', payload: error.message });
            throw error;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const loadFriendRequests = async () => {
        try {
            const response = await socketService.getFriendRequests();
            dispatch({ type: 'SET_FRIEND_REQUESTS', payload: response.requests || [] });
        } catch (error: any) {
            dispatch({ type: 'SET_ERROR', payload: error.message || '加载好友申请失败' });
            throw error;
        }
    };

    const loadSentFriendRequests = async () => {
        try {
            const response = await socketService.getSentFriendRequests();
            dispatch({ type: 'SET_SENT_FRIEND_REQUESTS', payload: response.requests || [] });
        } catch (error: any) {
            dispatch({ type: 'SET_ERROR', payload: error.message || '加载已发送好友申请失败' });
            throw error;
        }
    };

    const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject' | 'block') => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            await socketService.handleFriendRequest(requestId, action);
            dispatch({ type: 'REMOVE_FRIEND_REQUEST', payload: requestId });
        } catch (error: any) {
            dispatch({ type: 'SET_ERROR', payload: error.message || '处理好友申请失败' });
            throw error;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const removeFriend = async (friendId: string) => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await socketService.removeFriend(friendId);
            dispatch({ type: 'FRIEND_REMOVED', payload: { chatId: response.chatId } });
            if (localStorage.getItem('lastActiveChatId') === response.chatId) {
                localStorage.removeItem('lastActiveChatId');
            }
        } catch (error: any) {
            dispatch({ type: 'SET_ERROR', payload: error.message || '删除好友失败' });
            throw error;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const clearChatMessages = async (chatId: string) => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            await socketService.clearChatMessages(chatId);
            dispatch({ type: 'CHAT_CLEARED', payload: { chatId } });
        } catch (error: any) {
            dispatch({ type: 'SET_ERROR', payload: error.message || '清空聊天记录失败' });
            throw error;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const summarizeGroupChat = async (chatId: string, onChunk?: (accumulated: string) => void): Promise<string> => {
        dispatch({ type: 'SET_ERROR', payload: null });
        try {
            return await socketService.summarizeGroupChat(chatId, onChunk);
        } catch (error: any) {
            const msg = error instanceof Error ? error.message : '摘要生成失败';
            dispatch({ type: 'SET_ERROR', payload: msg });
            throw error;
        }
    };

    const createNewPigsailChat = async () => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await socketService.createPigsailChat();
            const parsedChat = parseChat(response.chat);
            dispatch({ type: 'ADD_CHAT', payload: parsedChat });
            // Reuse the normal chat-switch flow so unread is cleared immediately.
            setCurrentChat(parsedChat);
            dispatch({ type: 'SET_MESSAGES', payload: response.messages || [] });
            if (response.recipient) {
                dispatch({ type: 'CACHE_USERS', payload: [response.recipient] });
            }
        } catch (error: any) {
            dispatch({ type: 'SET_ERROR', payload: error.message || '开启 PigSail 新对话失败' });
            throw error;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const updateUserProfile = async (data: { displayName?: string; avatar?: string; password?: string; email?: string }) => {
        console.log('=== UPDATE PROFILE START ===');

        const freshUser = apiService.getUser();
        console.log('Fresh user from localStorage:', freshUser);

        if (!freshUser || !freshUser.id) {
            console.error('ERROR: No valid user found in localStorage!');
            dispatch({ type: 'SET_ERROR', payload: 'User session corrupted. Please log in again.' });
            apiService.removeUser();
            localStorage.removeItem('token');
            return;
        }

        console.log('User ID from localStorage:', freshUser.id);
        console.log('Data to update:', data);

        const userId = freshUser.id;

        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            console.log('Updating user via API with ID:', userId);
            await apiService.updateUser(userId, data);

            console.log('Fetching updated user data from API...');
            const freshUserData = await apiService.getUserById(userId);
            console.log('Fresh user data from API:', freshUserData);

            apiService.setUser(freshUserData);
            dispatch({ type: 'SET_USER', payload: { user: freshUserData, token: state.token! } });

            socketService.updateProfile({ displayName: freshUserData.displayName, avatar: freshUserData.avatar });

            console.log('Profile updated successfully for user:', freshUserData.displayName);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            dispatch({ type: 'SET_ERROR', payload: error.message });
            throw error;
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const contextValue: ChatContextTypeExtended = {
        ...state,
        login, register, logout, setCurrentChat, sendMessage, markMessagesAsRead,
        createGroup, addGroupMembers, removeGroupMember, updateGroupProfile, getPrivateChat, leaveGroup, typingStart, typingStop,
        addFriend, loadFriendRequests, loadSentFriendRequests, handleFriendRequest, removeFriend, clearChatMessages, createNewPigsailChat, updateUserProfile,
        toggleMessageReaction, deleteMessage,
        summarizeGroupChat,
        getUserInfo,
        clearError
    };

    return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) throw new Error('useChat must be used within a ChatProvider');
    return context;
}