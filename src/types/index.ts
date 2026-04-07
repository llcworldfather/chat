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

export interface DebateMessageMeta {
    side: 'affirmative' | 'negative';
    round: 1 | 2 | 3;
    role: 'first' | 'second' | 'third';
}

export interface DebateConfig {
    topic: string;
    affirmativePersonas: [string, string, string];
    negativePersonas: [string, string, string];
}

export type DebatePhase = 'pending' | 'debating' | 'judging' | 'voting' | 'closed';

export interface DebateState {
    phase: DebatePhase;
    currentTurnIndex: number;
    votes: Record<string, 'affirmative' | 'negative'>;
    voteCounts?: { affirmative: number; negative: number };
    winner?: 'affirmative' | 'negative' | 'tie';
    judgeVerdict?: 'affirmative' | 'negative' | 'tie';
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
    replyToId?: string;
    reactions: Record<string, string[]>;
    isStreaming?: boolean;   // true while the AI is still writing
    debate?: DebateMessageMeta;
    debateJudge?: boolean;
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
    debateConfig?: DebateConfig;
    debateState?: DebateState;
}

export interface FriendRequest {
    id: string;
    senderId: string;
    recipientId: string;
    status: 'pending' | 'accepted' | 'rejected' | 'blocked';
    message: string;
    createdAt: Date;
    updatedAt: Date;
    respondedAt?: Date;
    sender?: User;
    recipient?: User;
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
    debateMode?: boolean;
    debateTopic?: string;
    affirmativePersonas?: string[];
    negativePersonas?: string[];
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
    friendRequests: FriendRequest[];
    sentFriendRequests: FriendRequest[];

    // Actions
    login: (username: string, password: string) => Promise<void>;
    register: (userData: RegisterRequest) => Promise<void>;
    logout: () => void;
    setCurrentChat: (chat: Chat | null, options?: { aroundMessageId?: string }) => void;
    sendMessage: (chatId: string, content: string, type?: string, replyToId?: string) => void;
    toggleMessageReaction: (chatId: string, messageId: string, emoji: string) => void;
    deleteMessage: (chatId: string, messageId: string) => void;
    markMessagesAsRead: (chatId: string) => void;
    createGroup: (groupData: CreateGroupData) => void;
    debateStart: (chatId: string) => Promise<void>;
    submitDebateVote: (chatId: string, side: 'affirmative' | 'negative') => Promise<void>;
    addGroupMembers: (chatId: string, memberIds: string[]) => Promise<void>;
    removeGroupMember: (chatId: string, memberId: string) => Promise<void>;
    updateGroupProfile: (chatId: string, data: { name?: string; avatar?: string }) => Promise<void>;
    getPrivateChat: (recipientId: string) => void;
    leaveGroup: (chatId: string) => void;
    typingStart: (chatId: string) => void;
    typingStop: (chatId: string) => void;
    addFriend: (friendName: string) => Promise<void>;
    loadFriendRequests: () => Promise<void>;
    loadSentFriendRequests: () => Promise<void>;
    handleFriendRequest: (requestId: string, action: 'accept' | 'reject' | 'block') => Promise<void>;
    removeFriend: (friendId: string) => Promise<void>;
    clearChatMessages: (chatId: string) => Promise<void>;
    createNewPigsailChat: () => Promise<void>;
    updateUserProfile: (data: { displayName?: string; avatar?: string; password?: string; email?: string }) => Promise<void>;
    summarizeGroupChat: (chatId: string, onChunk?: (accumulated: string) => void) => Promise<string>;
    messageHistoryLoading: boolean;
    messageHistoryHasMore: boolean;
    loadOlderMessages: (chatId: string, beforeMessageId: string, limit?: number) => Promise<number>;

    // [新增] 清除错误的方法
    clearError: () => void;
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