import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
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
  RegisterRequest
} from '../types';

// State interface
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
}

// Action types
type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: { user: User; token: string } }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_CURRENT_USER'; payload: SocketUser }
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'SET_CURRENT_CHAT'; payload: Chat | null }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_ONLINE_USERS'; payload: SocketUser[] }
  | { type: 'UPDATE_USER_STATUS'; payload: { userId: string; status: string } }
  | { type: 'SET_TYPING_USERS'; payload: TypingUser[] }
  | { type: 'MARK_MESSAGES_READ'; payload: { chatId: string; userId: string } }
  | { type: 'USER_LEFT_GROUP'; payload: { chatId: string; userId: string } }
  | { type: 'REMOVE_CHAT'; payload: string }
  | { type: 'UPDATE_USER_INFO'; payload: { userId: string; userInfo: any } };

// Helper function to convert object back to Map
const parseChat = (chat: any): Chat => {
  return {
    ...chat,
    unreadCounts: new Map(Object.entries(chat.unreadCounts || {}))
  };
};

// Initial state
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
};

// Reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };

    case 'CLEAR_USER':
      return {
        ...initialState,
        user: null,
        token: null,
        currentUser: null,
      };

    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };

    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };

    case 'SET_CHATS':
      return { ...state, chats: action.payload.map((chat: any) => parseChat(chat)) };

    case 'ADD_CHAT':
      return { ...state, chats: [action.payload, ...state.chats] };

    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload, messages: [] };

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'ADD_MESSAGE':
      const newMessage = action.payload;
      const isCurrentChat = state.currentChat?.id === newMessage.chatId;

      // Update last message in chat
      const chatsWithLastMessage = state.chats.map(chat =>
        chat.id === newMessage.chatId
          ? { ...chat, lastMessage: newMessage }
          : chat
      );

      return {
        ...state,
        chats: chatsWithLastMessage,
        messages: isCurrentChat ? [...state.messages, newMessage] : state.messages,
      };

    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };

    case 'UPDATE_USER_STATUS':
      const { userId: statusUserId, status: userStatus } = action.payload;
      const usersWithStatus = state.onlineUsers.map(user =>
        user.id === statusUserId ? { ...user, status: userStatus as 'online' | 'away' } : user
      );

      const chatsWithStatus = state.chats.map(chat => {
        if (chat.type === 'private') {
          const otherParticipant = chat.participants.find(id => id !== state.user?.id);
          if (otherParticipant === statusUserId) {
            // Update chat status based on participant status
            return chat;
          }
        }
        return chat;
      });

      return {
        ...state,
        onlineUsers: usersWithStatus,
        chats: chatsWithStatus,
      };

    case 'SET_TYPING_USERS':
      return { ...state, typingUsers: action.payload };

    case 'MARK_MESSAGES_READ':
      const { chatId: readChatId, userId: readUserId } = action.payload;
      const messagesWithRead = state.messages.map(msg =>
        msg.chatId === readChatId ? { ...msg, readBy: Array.from(new Set([...msg.readBy, readUserId])) } : msg
      );

      const chatsAfterRead = state.chats.map(chat => {
        if (chat.id === readChatId) {
          // 安全地处理unreadCounts Map
          const unreadCounts = chat.unreadCounts instanceof Map
            ? new Map(chat.unreadCounts)
            : new Map();
          unreadCounts.set(readUserId, 0);
          return { ...chat, unreadCounts };
        }
        return chat;
      });

      return {
        ...state,
        messages: messagesWithRead,
        chats: chatsAfterRead,
      };

    case 'USER_LEFT_GROUP':
      const { chatId: leftChatId, userId: leftUserId } = action.payload;
      const updatedChatsAfterLeave = state.chats.map(chat =>
        chat.id === leftChatId
          ? { ...chat, participants: chat.participants.filter(id => id !== leftUserId) }
          : chat
      );

      return {
        ...state,
        chats: updatedChatsAfterLeave,
        currentChat: state.currentChat?.id === leftChatId ? null : state.currentChat,
      };

    case 'REMOVE_CHAT':
      const filteredChats = state.chats.filter(chat => chat.id !== action.payload);
      return {
        ...state,
        chats: filteredChats,
        currentChat: state.currentChat?.id === action.payload ? null : state.currentChat,
      };

    case 'UPDATE_USER_INFO':
      // 这个action主要用于通知组件更新用户信息缓存
      return state;

    default:
      return state;
  }
}

// Context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider
interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const setupSocketListeners = () => {
    // Connection events
    socketService.onChatsLoaded((chats) => {
      dispatch({ type: 'SET_CHATS', payload: chats });
    });

    socketService.onOnlineUsers((users) => {
      dispatch({ type: 'SET_ONLINE_USERS', payload: users });
    });

    socketService.onUserStatusChanged((data) => {
      dispatch({ type: 'UPDATE_USER_STATUS', payload: data });
    });

    // Chat events
    socketService.onPrivateChatLoaded(({ chat, messages }) => {
      dispatch({ type: 'SET_CURRENT_CHAT', payload: parseChat(chat) });
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    });

    socketService.onGroupCreated((chat) => {
      dispatch({ type: 'ADD_CHAT', payload: parseChat(chat) });
    });

    socketService.onGroupCreatedSuccess((chat) => {
      const parsedChat = parseChat(chat);
      dispatch({ type: 'ADD_CHAT', payload: parsedChat });
      dispatch({ type: 'SET_CURRENT_CHAT', payload: parsedChat });
    });

    socketService.onNewMessage((message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    });

    socketService.onMessagesRead((data) => {
      dispatch({ type: 'MARK_MESSAGES_READ', payload: data });
    });

    socketService.onFriendAdded(({ chat, friend, systemMessage }) => {
      dispatch({ type: 'ADD_CHAT', payload: parseChat(chat) });
      // 更新用户信息缓存
      if (friend) {
        dispatch({ type: 'UPDATE_USER_INFO', payload: { userId: friend.id, userInfo: friend } });
      }
      if (systemMessage) {
        dispatch({ type: 'ADD_MESSAGE', payload: systemMessage });
      }
    });

    socketService.onUserTyping(({ chatId, user }) => {
      const existingTypingUsers = state.typingUsers.filter(u => !(u.chatId === chatId && u.userId === user.userId));
      dispatch({ type: 'SET_TYPING_USERS', payload: [...existingTypingUsers, { ...user, chatId }] });
    });

    socketService.onUserStopTyping(({ chatId, userId }) => {
      const filteredTypingUsers = state.typingUsers.filter(u => !(u.chatId === chatId && u.userId === userId));
      dispatch({ type: 'SET_TYPING_USERS', payload: filteredTypingUsers });
    });

    socketService.onUserLeftGroup((data) => {
      dispatch({ type: 'USER_LEFT_GROUP', payload: data });
    });

    socketService.onLeftGroup(({ chatId }) => {
      if (state.currentChat?.id === chatId) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
      }
      dispatch({ type: 'REMOVE_CHAT', payload: chatId });
    });

    socketService.onError(({ message }) => {
      dispatch({ type: 'SET_ERROR', payload: message });
    });
  };

  // Initialize connection and load user data
  useEffect(() => {
    const initializeApp = async () => {
      // Skip if user is already set
      if (state.user) return;

      const token = apiService.getToken();
      const user = apiService.getUser();

      if (token && user) {
        dispatch({ type: 'SET_USER', payload: { user, token } });

        try {
          await socketService.connect(token);
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });

          // Set up socket event listeners
          setupSocketListeners();
        } catch (error) {
          console.error('Failed to connect to socket:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to server' });
          // Clear invalid token/user
          apiService.clearAuth();
          dispatch({ type: 'CLEAR_USER' });
        }
      }
    };

    initializeApp();

    return () => {
      socketService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Actions
  const login = async (username: string, password: string) => {
    console.log('Login attempt started for username:', username);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      console.log('Calling API service login...');
      const response = await apiService.login({ username, password });
      console.log('API login successful, response:', response);

      // Store auth data
      apiService.setToken(response.token);
      apiService.setUser(response.user);
      console.log('Auth data stored in localStorage');

      dispatch({ type: 'SET_USER', payload: { user: response.user, token: response.token } });
      console.log('User state dispatched');

      // Connect to socket (but don't fail login if socket connection fails)
      try {
        await socketService.connect(response.token);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        // Set up socket listeners
        setupSocketListeners();
      } catch (socketError) {
        console.warn('Socket connection failed, but login succeeded:', socketError);
        dispatch({ type: 'SET_ERROR', payload: '登录成功，但实时聊天功能可能受影响' });
      }
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      console.log('Login process completed, loading state set to false');
    }
  };

  const register = async (userData: RegisterRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const response = await apiService.register(userData);

      // Store auth data
      apiService.setToken(response.token);
      apiService.setUser(response.user);

      dispatch({ type: 'SET_USER', payload: { user: response.user, token: response.token } });

      // Connect to socket (but don't fail registration if socket connection fails)
      try {
        await socketService.connect(response.token);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        // Set up socket listeners
        setupSocketListeners();
      } catch (socketError) {
        console.warn('Socket connection failed, but registration succeeded:', socketError);
        dispatch({ type: 'SET_ERROR', payload: '注册成功，但实时聊天功能可能受影响' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Registration failed' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = () => {
    socketService.disconnect();
    apiService.clearAuth();
    dispatch({ type: 'CLEAR_USER' });
  };

  const setCurrentChat = (chat: Chat | null) => {
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    if (chat) {
      markMessagesAsRead(chat.id);
    }
  };

  const sendMessage = (chatId: string, content: string, type = 'text') => {
    if (content.trim()) {
      socketService.sendMessage(chatId, content.trim(), type);
    }
  };

  const markMessagesAsRead = (chatId: string) => {
    socketService.markMessagesRead(chatId);
  };

  const createGroup = (groupData: CreateGroupData) => {
    socketService.createGroup(groupData);
  };

  const getPrivateChat = (recipientId: string) => {
    socketService.getPrivateChat(recipientId);
  };

  const leaveGroup = (chatId: string) => {
    socketService.leaveGroup(chatId);
  };

  const typingStart = (chatId: string) => {
    socketService.typingStart(chatId);
  };

  const typingStop = (chatId: string) => {
    socketService.typingStop(chatId);
  };

  const addFriend = (friendName: string) => {
    socketService.addFriend(friendName);
  };

  const contextValue: ChatContextType = {
    ...state,
    login,
    register,
    logout,
    setCurrentChat,
    sendMessage,
    markMessagesAsRead,
    createGroup,
    getPrivateChat,
    leaveGroup,
    typingStart,
    typingStop,
    addFriend,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook to use the context
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}