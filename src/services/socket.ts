import { io, Socket } from 'socket.io-client';
import { User, Message, Chat, SocketUser, CreateGroupData, TypingUser, FriendRequest } from '../types';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

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

    onChatMessagesLoaded(callback: (data: { chat: Chat; messages: Message[]; recipient: User | null }) => void): void {
        this.socket?.on('chat_messages_loaded', callback);
    }

    onGroupCreated(callback: (chat: Chat) => void): void {
        this.socket?.on('group_created', callback);
    }

    onGroupCreatedSuccess(callback: (chat: Chat) => void): void {
        this.socket?.on('group_created_success', callback);
    }

    onGroupProfileUpdated(callback: (chat: Chat) => void): void {
        this.socket?.on('group_profile_updated', callback);
    }

    onNewMessage(callback: (message: Message) => void): void {
        this.socket?.on('new_message', callback);
    }

    onMessageReactionUpdated(callback: (message: Message) => void): void {
        this.socket?.on('message_reaction_updated', callback);
    }

    onMessageDeleted(callback: (message: Message) => void): void {
        this.socket?.on('message_deleted', callback);
    }

    onMessagesRead(callback: (data: { chatId: string; userId: string }) => void): void {
        this.socket?.on('messages_read', callback);
    }

    onFriendAdded(callback: (data: { chat: Chat; friend: User; systemMessage: Message | null }) => void): void {
        this.socket?.on('friend_added', callback);
    }

    onFriendRemoved(callback: (data: { chatId: string; friendId: string }) => void): void {
        this.socket?.on('friend_removed', callback);
    }

    onFriendRequestsLoaded(callback: (requests: FriendRequest[]) => void): void {
        this.socket?.on('friend_requests_loaded', callback);
    }

    onFriendSentRequestsLoaded(callback: (requests: FriendRequest[]) => void): void {
        this.socket?.on('friend_sent_requests_loaded', callback);
    }

    onFriendRequestReceived(callback: (request: FriendRequest) => void): void {
        this.socket?.on('friend_request_received', callback);
    }

    onFriendRequestHandled(
        callback: (data: { requestId: string; action: 'accepted' | 'rejected' | 'blocked'; byUser: User }) => void
    ): void {
        this.socket?.on('friend_request_handled', callback);
    }

    onChatCleared(callback: (data: { chatId: string; clearedBy: string }) => void): void {
        this.socket?.on('chat_cleared', callback);
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

    // AI streaming events
    onAiStreamStart(callback: (data: { message: Message }) => void): void {
        this.socket?.on('ai_stream_start', callback);
    }

    onAiStreamChunk(callback: (data: { messageId: string; chatId: string; chunk: string }) => void): void {
        this.socket?.on('ai_stream_chunk', callback);
    }

    onAiStreamEnd(callback: (data: { message: Message }) => void): void {
        this.socket?.on('ai_stream_end', callback);
    }

    onMentionedInChat(callback: (data: {
        chatId: string;
        messageId: string;
        fromUserId: string;
        fromDisplayName: string;
        fromUsername: string;
        chatName: string;
        contentPreview: string;
        timestamp: Date;
    }) => void): void {
        this.socket?.on('mentioned_in_chat', callback);
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

    getChatMessages(chatId: string, aroundMessageId?: string): void {
        const payload = { chatId, aroundMessageId: aroundMessageId || undefined };
        console.log('[Socket] getChatMessages 发送:', payload);
        this.socket?.emit('get_chat_messages', payload);
    }

    searchMessagesGlobal(query: string): Promise<Array<{ chatId: string; chatName: string; messages: Message[] }>> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            this.socket.emit('search_messages_global', { query }, (response: any) => {
                if (response?.error) {
                    reject(new Error(response.error));
                    return;
                }
                resolve(response?.data ?? []);
            });
        });
    }

    /** 预览：以某条消息为窗口末尾，向前取历史（不触发主会话列表） */
    previewChatMessages(chatId: string, endingAtMessageId: string, limit = 50): Promise<Message[]> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            this.socket.emit(
                'preview_chat_messages',
                { chatId, endingAtMessageId, limit },
                (response: any) => {
                    if (response?.error) {
                        reject(new Error(response.error));
                        return;
                    }
                    resolve(response?.messages ?? []);
                }
            );
        });
    }

    loadOlderMessages(
        chatId: string,
        beforeMessageId: string,
        limit = 30
    ): Promise<{ messages: Message[]; hasMore: boolean }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            let finished = false;
            const finishResolve = (payload: { messages: Message[]; hasMore: boolean }) => {
                if (finished) return;
                finished = true;
                resolve(payload);
            };
            const finishReject = (err: Error) => {
                if (finished) return;
                finished = true;
                reject(err);
            };

            const timer = window.setTimeout(async () => {
                if (finished) return;
                // Fallback path for environments still running server code
                // without `load_older_messages` callback support.
                try {
                    const previewWindow = await this.previewChatMessages(chatId, beforeMessageId, limit + 1);
                    const older = (previewWindow || []).filter((m) => m.id !== beforeMessageId);
                    finishResolve({
                        messages: older,
                        hasMore: (previewWindow || []).length >= limit + 1
                    });
                } catch (error: any) {
                    finishReject(new Error(error?.message || '加载历史消息失败'));
                }
            }, 2000);

            this.socket.emit(
                'load_older_messages',
                { chatId, beforeMessageId, limit },
                (response: any) => {
                    window.clearTimeout(timer);
                    if (finished) return;
                    if (response?.error) {
                        finishReject(new Error(response.error));
                        return;
                    }
                    finishResolve({
                        messages: response?.messages ?? [],
                        hasMore: Boolean(response?.hasMore)
                    });
                }
            );
        });
    }

    /**
     * 群聊摘要（流式）：通过 onChunk 实时收到已拼接的完整文本；Promise 在完成时 resolve 为最终全文
     * 仅用 requestId 关联事件（避免 chatId 类型不一致导致永远收不到 end、Promise 挂起）
     * 不使用 emit 的 ack 回调（长时间操作易导致 ack 异常）
     */
    summarizeGroupChat(chatId: string, onChunk?: (accumulated: string) => void): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            const requestId =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `gs_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

            let accumulated = '';
            let finished = false;
            let timeoutId: number | undefined;

            const TIMEOUT_MS = 180000;

            const cleanup = () => {
                if (timeoutId !== undefined) {
                    window.clearTimeout(timeoutId);
                    timeoutId = undefined;
                }
                this.socket?.off('group_summary_stream_start', onStart);
                this.socket?.off('group_summary_stream_chunk', onChunkEvt);
                this.socket?.off('group_summary_stream_end', onEnd);
                this.socket?.off('group_summary_stream_error', onErr);
            };

            const finish = (fn: () => void) => {
                if (finished) return;
                finished = true;
                cleanup();
                fn();
            };

            timeoutId = window.setTimeout(() => {
                finish(() =>
                    reject(new Error('摘要超时（请检查网络与 DEEPSEEK_API_KEY），或稍后重试'))
                );
            }, TIMEOUT_MS);

            const onStart = (data: { chatId?: string; requestId?: string }) => {
                if (data?.requestId !== requestId) return;
                accumulated = '';
                onChunk?.('');
            };

            const onChunkEvt = (data: { chatId?: string; requestId?: string; chunk?: string }) => {
                if (data?.requestId !== requestId) return;
                accumulated += data.chunk || '';
                onChunk?.(accumulated);
            };

            const onEnd = (data: { chatId?: string; requestId?: string }) => {
                if (data?.requestId !== requestId) return;
                finish(() => resolve(accumulated));
            };

            const onErr = (data: { chatId?: string; requestId?: string; message?: string }) => {
                if (data?.requestId !== requestId) return;
                finish(() => reject(new Error(data.message || '摘要生成失败')));
            };

            this.socket.on('group_summary_stream_start', onStart);
            this.socket.on('group_summary_stream_chunk', onChunkEvt);
            this.socket.on('group_summary_stream_end', onEnd);
            this.socket.on('group_summary_stream_error', onErr);

            // 仅发事件，不依赖服务端 ack（避免 Socket.io 对长耗时 ack 的兼容问题）
            this.socket.emit('summarize_group_chat', { chatId: String(chatId), requestId, stream: true });
        });
    }

    createPigsailChat(): Promise<{ chat: Chat; messages: Message[]; recipient: User | null }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.socket.emit('create_pigsail_chat', (response: any) => {
                if (!response) {
                    reject(new Error('创建 PigSail 对话失败'));
                    return;
                }
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }
                resolve(response);
            });
        });
    }

    createGroup(groupData: CreateGroupData): void {
        this.socket?.emit('create_group', groupData);
    }

    addGroupMembers(chatId: string, memberIds: string[]): Promise<{ success: boolean; chat: Chat; addedMemberIds: string[] }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            this.socket.emit('add_group_members', { chatId, memberIds }, (response: any) => {
                if (!response || response.error) {
                    reject(new Error(response?.error || '添加群成员失败'));
                    return;
                }
                resolve(response);
            });
        });
    }

    removeGroupMember(chatId: string, memberId: string): Promise<{ success: boolean; chat: Chat; removedMemberId: string }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            this.socket.emit('remove_group_member', { chatId, memberId }, (response: any) => {
                if (!response || response.error) {
                    reject(new Error(response?.error || '移除群成员失败'));
                    return;
                }
                resolve(response);
            });
        });
    }

    updateGroupProfile(chatId: string, data: { name?: string; avatar?: string }): Promise<{ success: boolean; chat: Chat }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            this.socket.emit('update_group_profile', { chatId, ...data }, (response: any) => {
                if (!response || response.error) {
                    reject(new Error(response?.error || '更新群资料失败'));
                    return;
                }
                resolve(response);
            });
        });
    }

    sendMessage(chatId: string, content: string, type?: string, replyToId?: string): void {
        this.socket?.emit('send_message', { chatId, content, type, replyToId });
    }

    toggleReaction(chatId: string, messageId: string, emoji: string): void {
        this.socket?.emit('toggle_reaction', { chatId, messageId, emoji });
    }

    deleteMessage(chatId: string, messageId: string): void {
        this.socket?.emit('delete_message', { chatId, messageId });
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

    getFriendRequests(): Promise<{ requests: FriendRequest[] }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            this.socket.emit('get_friend_requests', (response: any) => {
                if (!response || response.error) {
                    reject(new Error(response?.error || '加载好友申请失败'));
                    return;
                }
                resolve(response);
            });
        });
    }

    getSentFriendRequests(): Promise<{ requests: FriendRequest[] }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            this.socket.emit('get_sent_friend_requests', (response: any) => {
                if (!response || response.error) {
                    reject(new Error(response?.error || '加载已发送申请失败'));
                    return;
                }
                resolve(response);
            });
        });
    }

    handleFriendRequest(
        requestId: string,
        action: 'accept' | 'reject' | 'block'
    ): Promise<{ success: boolean; action: 'accepted' | 'rejected' | 'blocked'; requestId: string }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            this.socket.emit('handle_friend_request', { requestId, action }, (response: any) => {
                if (!response || response.error) {
                    reject(new Error(response?.error || '处理好友申请失败'));
                    return;
                }
                resolve(response);
            });
        });
    }

    removeFriend(friendId: string): Promise<{ success: boolean; chatId: string }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            this.socket.emit('remove_friend', friendId, (response: any) => {
                if (!response || response.error) {
                    reject(new Error(response?.error || '删除好友失败'));
                    return;
                }
                resolve(response);
            });
        });
    }

    clearChatMessages(chatId: string): Promise<{ success: boolean; chatId: string }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not connected'));
                return;
            }
            this.socket.emit('clear_chat_messages', chatId, (response: any) => {
                if (!response || response.error) {
                    reject(new Error(response?.error || '清空聊天记录失败'));
                    return;
                }
                resolve(response);
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

    // API call for random avatar
    async getRandomAvatar(): Promise<string> {
        try {
            const response = await fetch(`${SERVER_URL}/api/random-avatar`);
            const result = await response.json();
            if (result.success && result.data.avatarUrl) {
                const url = String(result.data.avatarUrl).trim();
                // API already returns an absolute URL; do not prefix SERVER_URL (would produce invalid URLs).
                if (/^https?:\/\//i.test(url)) {
                    return url;
                }
                const path = url.startsWith('/') ? url : `/${url}`;
                return `${SERVER_URL.replace(/\/$/, '')}${path}`;
            } else {
                throw new Error(result.error || 'Failed to get random avatar');
            }
        } catch (error) {
            console.error('Error getting random avatar:', error);
            throw error;
        }
    }

    getSocket(): Socket | null {
        return this.socket;
    }
}

export const socketService = new SocketService();
