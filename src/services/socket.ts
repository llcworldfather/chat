import { io, Socket } from 'socket.io-client';
import { User, Message, Chat, SocketUser, CreateGroupData, TypingUser } from '../types';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5003';

class SocketService {
    private socket: Socket | null = null;
    private token: string | null = null;

    // [修改] 第一步：只初始化对象，不连接
    initialize(token: string): void {
        this.token = token;

        // 如果已经有 socket 实例且 token 没变，就不用重新创建
        if (this.socket && this.socket.auth && (this.socket.auth as any).token === token) {
            return;
        }

        // 销毁旧连接
        if (this.socket) {
            this.socket.disconnect();
        }

        console.log('Initializing socket instance...');
        this.socket = io(SERVER_URL, {
            auth: {
                token
            },
            transports: ['websocket', 'polling'],
            autoConnect: false // [关键] 禁止自动连接，等待监听器设置完毕
        });

        // 设置基础监听
        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }

    // [修改] 第二步：手动触发连接
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error('Socket not initialized. Call initialize() first.'));
            }

            if (this.socket.connected) {
                return resolve();
            }

            console.log('Connecting to socket...');

            // 临时监听一次 connect 事件用于 Promise resolve
            this.socket.once('connect', () => {
                console.log('Connected to server successfully');
                resolve();
            });

            // 这里也需要处理连接错误，否则 Promise 会卡住
            this.socket.once('connect_error', (err) => {
                reject(err);
            });

            this.socket.connect();
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
        // 确保不重复监听 (可选优化)
        this.socket?.off('online_users');
        this.socket?.on('online_users', (users: SocketUser[]) => {
            console.log('Socket received online_users:', users.length);
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

    onUserProfileUpdated(callback: (user: SocketUser) => void): void {
        this.socket?.on('user_profile_updated', callback);
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

    // 支持 Promise 回调
    addFriend(friendName: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
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

    updateProfile(data: { displayName?: string; avatar?: string }): void {
        this.socket?.emit('update_profile', data);
    }

    getSocket(): Socket | null {
        return this.socket;
    }
}

export const socketService = new SocketService();