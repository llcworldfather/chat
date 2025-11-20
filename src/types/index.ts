export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  joinedAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  chatId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'emoji' | 'system';
  readBy: string[];
  isEdited: boolean;
  editedAt?: Date;
}

export interface Chat {
  id: string;
  name?: string;
  avatar?: string;
  type: 'private' | 'group';
  participants: string[];
  adminId?: string;
  createdAt: Date;
  lastMessage?: Message;
  unreadCounts: Map<string, number>;
}

export interface SocketUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'away';
  socketId: string;
}

export interface AuthUser {
  user: User;
  token: string;
}

export interface CreateGroupData {
  name: string;
  participantIds: string[];
  avatar?: string;
}

export interface TypingUser {
  userId: string;
  username: string;
  isTyping: boolean;
  lastTypingTime: Date;
  chatId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RegisterRequest {
  username: string;
  displayName: string;
  password: string;
  email?: string;
  avatar?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ChatContextType {
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

  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  setCurrentChat: (chat: Chat | null) => void;
  sendMessage: (chatId: string, content: string, type?: string) => void;
  markMessagesAsRead: (chatId: string) => void;
  createGroup: (groupData: CreateGroupData) => void;
  getPrivateChat: (recipientId: string) => void;
  leaveGroup: (chatId: string) => void;
  typingStart: (chatId: string) => void;
  typingStop: (chatId: string) => void;
  addFriend: (friendName: string) => void;
}

export interface AppState {
  isMenuOpen: boolean;
  isMobile: boolean;
  theme: 'dark' | 'light';
}

export interface AppContextType {
  state: AppState;
  toggleMenu: () => void;
  setMobile: (isMobile: boolean) => void;
  toggleTheme: () => void;
}