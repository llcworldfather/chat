import { io, Socket } from 'socket.io-client';
import { User, Message, Chat, SocketUser, CreateGroupData, TypingUser } from '../types';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5003';

class SocketService {
    private socket: Socket | null = null;
    private token: string | null = null;

    connect(token: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.token = token;

            console.log('Attempting to connect to socket with token:', token ? 'token provided' : 'no token');

            this.socket = io(SERVER_URL, {
                auth: {
                    token
                },
                transports: ['websocket', 'polling']
            });

            this.socket.on('connect', () => {
                console.log('Connected to server successfully');
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                console.error('Auth data being sent:', { token });
                reject(error);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('Disconnected from server:', reason);
            });

            this.socket.on('error', (error) => {
                console.error('Socket error:', error);
            });
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.token = null;
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    // Chat events
    onChatsLoaded(callback: (chats: Chat[]) => void): void {
        this.socket?.on('chats_loaded', callback);
    }

    onOnlineUsers(callback: (users: SocketUser[]) => void): void {
        console.log('SocketService - Setting up online_users listener');
        this.socket?.on('online_users', (users: SocketUser[]) => {
            console.log('SocketService - online_users event received:', users.map((u: SocketUser) => u.displayName));
            callback(users);
        });
    }

    onUserStatusChanged(callback: (data: { userId: string; status: string }) => void): void {
        this.socket?.on('user_status_changed', callback);
    }

    onPrivateChatLoaded(callback: (data: { chat: Chat; messages: Message[]; recipient: User | null }) => void): void {
        this.socket?.on('private_chat_loaded', callback);
    }

    onGroupCreated(callback: (chat: Chat) => void): void {
        this.socket?.on('group_created', callback);
    }

    onGroupCreatedSuccess(callback: (chat: Chat) => void): void {
        this.socket?.on('group_created_success', callback);
    }

    onNewMessage(callback: (message: Message) => void): void {
        this.socket?.on('new_message', callback);
    }

    onMessagesRead(callback: (data: { chatId: string; userId: string }) => void): void {
        this.socket?.on('messages_read', callback);
    }

    // 确保这个方法存在，因为我们在 App.tsx 中使用了它
    onFriendAdded(callback: (data: { chat: Chat; friend: User; systemMessage: Message | null }) => void): void {
        this.socket?.on('friend_added', callback);
    }

    onUserTyping(callback: (data: { chatId: string; user: TypingUser }) => void): void {
        this.socket?.on('user_typing', callback);
    }

    onUserStopTyping(callback: (data: { chatId: string; userId: string }) => void): void {
        this.socket?.on('user_stop_typing', callback);
    }

    onUserLeftGroup(callback: (data: { chatId: string; userId: string; message: Message }) => void): void {
        this.socket?.on('user_left_group', callback);
    }

    onLeftGroup(callback: (data: { chatId: string }) => void): void {
        this.socket?.on('left_group', callback);
    }

    onError(callback: (error: { message: string }) => void): void {
        this.socket?.on('error', callback);
    }

    // Remove event listeners
    off(event: string, callback?: Function): void {
        if (callback) {
            this.socket?.off(event, callback as any);
        } else {
            this.socket?.off(event);
        }
    }

    // Emit events
    getPrivateChat(recipientId: string): void {
        this.socket?.emit('get_private_chat', recipientId);
    }

    createGroup(groupData: CreateGroupData): void {
        this.socket?.emit('create_group', groupData);
    }

    sendMessage(chatId: string, content: string, type?: string): void {
        this.socket?.emit('send_message', { chatId, content, type });
    }

    // [修改] 将 addFriend 改为返回 Promise，支持回调获取结果
    addFriend(friendName: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            // 使用 Socket.io 的回调功能 (Acknowledgement)
            this.socket.emit('add_friend', friendName, (response: any) => {
                if (response && response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }

    markMessagesRead(chatId: string): void {
        this.socket?.emit('mark_messages_read', chatId);
    }

    typingStart(chatId: string): void {
        this.socket?.emit('typing_start', chatId);
    }

    typingStop(chatId: string): void {
        this.socket?.emit('typing_stop', chatId);
    }

    leaveGroup(chatId: string): void {
        this.socket?.emit('leave_group', chatId);
    }

    // Get socket instance for advanced usage
    getSocket(): Socket | null {
        return this.socket;
    }
}

export const socketService = new SocketService();