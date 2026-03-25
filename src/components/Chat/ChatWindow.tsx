import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send,
    Smile,
    Paperclip,
    MoreVertical,
    Phone,
    Video,
    Users,
    MessageCircle,
    CornerUpLeft,
    SmilePlus,
    Trash2,
    Copy,
    FileText,
    X,
    Loader2
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { formatDateTime, formatMessageDate } from '../../utils/timeUtils';
import { Message } from '../../types';
import { MarkdownBoldText } from '../MarkdownBoldText';

export function ChatWindow() {
    const {
        user,
        currentChat,
        messages,
        sendMessage,
        toggleMessageReaction,
        deleteMessage,
        typingStart,
        typingStop,
        typingUsers,
        onlineUsers,
        getUserInfo,
        summarizeGroupChat,
        messageHistoryLoading,
        messageHistoryHasMore,
        loadOlderMessages
    } = useChat();

    const [messageInput, setMessageInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyTarget, setReplyTarget] = useState<Message | null>(null);
    const [summaryState, setSummaryState] = useState<{
        open: boolean;
        loading: boolean;
        text: string;
        error: string | null;
    }>({ open: false, loading: false, text: '', error: null });
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [reactionPickerForId, setReactionPickerForId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ message?: Message; x: number; y: number } | null>(null);
    const [animatedReactionKey, setAnimatedReactionKey] = useState<string | null>(null);
    const messagesAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<number | undefined>(undefined);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const longPressTimerRef = useRef<number | undefined>(undefined);
    const skipAutoScrollOnceRef = useRef(false);

    const fetchOlderMessages = useCallback(async () => {
        if (!currentChat) return 0;
        if (messageHistoryLoading || !messageHistoryHasMore) return 0;
        if (messages.length === 0) return 0;

        const area = messagesAreaRef.current;
        const beforeMessageId = messages[0].id;
        const prevHeight = area?.scrollHeight ?? 0;
        const prevTop = area?.scrollTop ?? 0;

        skipAutoScrollOnceRef.current = true;
        console.log('[ChatWindow] load older trigger:', { chatId: currentChat.id, beforeMessageId });
        const loaded = await loadOlderMessages(currentChat.id, beforeMessageId, 30);
        console.log('[ChatWindow] load older result:', { loaded });
        if (loaded <= 0) {
            skipAutoScrollOnceRef.current = false;
            return 0;
        }

        if (area) {
            requestAnimationFrame(() => {
                const nextHeight = area.scrollHeight;
                area.scrollTop = prevTop + (nextHeight - prevHeight);
            });
        }
        return loaded;
    }, [currentChat, messageHistoryLoading, messageHistoryHasMore, messages, loadOlderMessages]);

    useEffect(() => {
        if (skipAutoScrollOnceRef.current) {
            skipAutoScrollOnceRef.current = false;
            return;
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]); // typingUsers 变化时也滚动

    useEffect(() => {
        const area = messagesAreaRef.current;
        if (!area || !currentChat) return;

        const handleScroll = async () => {
            if (area.scrollTop > 60) return;
            await fetchOlderMessages();
        };

        area.addEventListener('scroll', handleScroll);
        return () => area.removeEventListener('scroll', handleScroll);
    }, [currentChat, fetchOlderMessages]);

    useEffect(() => {
        const area = messagesAreaRef.current;
        if (!area || !currentChat) return;
        if (messageHistoryLoading || !messageHistoryHasMore) return;
        if (messages.length === 0) return;

        // If content still cannot scroll, auto-load one more page.
        if (area.scrollHeight <= area.clientHeight + 8) {
            void fetchOlderMessages();
        }
    }, [messages, currentChat, messageHistoryLoading, messageHistoryHasMore, fetchOlderMessages]);

    useEffect(() => {
        (window as any).__chatContextMenuFix = 'v5-mousedown-capture';
    }, []);

    useEffect(() => {
        const handleClickOutsideMenu = (e: PointerEvent | MouseEvent) => {
            if (e.button !== 0) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest('.message-context-menu')) return;
            setContextMenu(null);
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setContextMenu(null);
        };
        window.addEventListener('pointerdown', handleClickOutsideMenu);
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('pointerdown', handleClickOutsideMenu);
            window.removeEventListener('keydown', handleEsc);
        };
    }, []);

    useEffect(() => {
        const handleContextMenuInsideChat = (e: MouseEvent): boolean => {
            const area = messagesAreaRef.current;
            const target = e.target as HTMLElement | null;
            if (!area || !target) return false;
            if (!area.contains(target)) return false;

            e.preventDefault();
            e.stopPropagation();

            const messageEl = target.closest('[data-message-id]') as HTMLElement | null;
            const messageId = messageEl?.dataset.messageId;
            const message = messageId ? messages.find((msg) => msg.id === messageId) : undefined;
            if (message && message.type !== 'system') {
                openMessageMenu(message, e.clientX, e.clientY);
            } else {
                setContextMenu({ x: e.clientX, y: e.clientY });
            }
            return true;
        };

        const previousOnContextMenu = window.oncontextmenu;
        const windowContextMenuHandler = (e: globalThis.MouseEvent) => {
            const handled = handleContextMenuInsideChat(e as unknown as MouseEvent);
            if (handled) return false;
            if (previousOnContextMenu) {
                return previousOnContextMenu.call(window, e as unknown as PointerEvent);
            }
            return undefined;
        };

        const docCaptureHandler = (e: MouseEvent) => {
            handleContextMenuInsideChat(e);
        };

        window.oncontextmenu = windowContextMenuHandler;
        document.addEventListener('contextmenu', docCaptureHandler, true);
        return () => {
            window.oncontextmenu = previousOnContextMenu;
            document.removeEventListener('contextmenu', docCaptureHandler, true);
        };
    }, [messages]);

    // 获取当前聊天的显示信息（头像、标题等）
    const getChatInfo = () => {
        if (!currentChat || !user) return null;

        if (currentChat.type === 'group') {
            return {
                name: currentChat.name || '未命名群组',
                avatar: currentChat.avatar || 'https://ui-avatars.com/api/?name=Group&background=random',
                status: `${currentChat.participants.length} 位成员`,
                isGroup: true
            };
        } else {
            const otherParticipantId = currentChat.participants.find(id => id !== user.id);
            const otherUser = otherParticipantId ? getUserInfo(otherParticipantId) : null;

            const displayName = otherUser ? (otherUser.displayName || otherUser.username) : '未知用户';
            const avatar = otherUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=random';
            const isOnline = onlineUsers.some(u => u.id === otherParticipantId);

            return {
                name: displayName,
                avatar,
                status: isOnline ? '在线' : '离线',
                isGroup: false,
                isOnline
            };
        }
    };

    const chatInfo = getChatInfo();
    const currentTypingUsers = typingUsers.filter(
        typingUser => typingUser.chatId === currentChat?.id && typingUser.userId !== user?.id
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessageInput(e.target.value);
        if (currentChat) {
            if (!typingTimeoutRef.current) { typingStart(currentChat.id); }
            if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); }
            typingTimeoutRef.current = window.setTimeout(() => {
                typingStop(currentChat.id);
                typingTimeoutRef.current = undefined;
            }, 1000);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (messageInput.trim() && currentChat) {
            sendMessage(currentChat.id, messageInput.trim(), 'text', replyTarget?.id);
            setMessageInput('');
            setReplyTarget(null);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = undefined;
            }
            typingStop(currentChat.id);
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        setMessageInput(prev => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const isOwnMessage = (message: any) => message.senderId === user?.id;
    const getReplyMessage = (message: Message) =>
        message.replyToId ? messages.find(m => m.id === message.replyToId) : undefined;
    const hasReacted = (message: Message, emoji: string) =>
        !!user?.id && (message.reactions?.[emoji] || []).includes(user.id);
    const messageQuickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    const triggerReactionAnimation = (messageId: string, emoji: string) => {
        const key = `${messageId}-${emoji}`;
        setAnimatedReactionKey(key);
        window.setTimeout(() => {
            setAnimatedReactionKey((prev) => (prev === key ? null : prev));
        }, 260);
    };
    const openMessageMenu = (message: Message, clientX: number, clientY: number) => {
        setContextMenu({ message, x: clientX, y: clientY });
        setReactionPickerForId(null);
    };
    const startLongPressMenu = (message: Message, touch: React.Touch) => {
        if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = window.setTimeout(() => {
            openMessageMenu(message, touch.clientX, touch.clientY);
        }, 420);
    };
    const clearLongPressMenu = () => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = undefined;
        }
    };
    const handleSummarize = async () => {
        if (!currentChat || currentChat.type !== 'group') return;
        setSummaryState({ open: true, loading: true, text: '', error: null });
        try {
            await summarizeGroupChat(currentChat.id, (accumulated) => {
                setSummaryState({ open: true, loading: true, text: accumulated, error: null });
            });
            setSummaryState((s) => ({ ...s, loading: false, error: null }));
        } catch {
            setSummaryState({ open: true, loading: false, text: '', error: '摘要生成失败' });
        }
    };

    const dismissSummary = () => {
        setSummaryState({ open: false, loading: false, text: '', error: null });
    };

    const copyMessageContent = async (message: Message) => {
        try {
            await navigator.clipboard.writeText(message.content || '');
        } catch {
            // fallback for restricted clipboard environments
            const textArea = document.createElement('textarea');
            textArea.value = message.content || '';
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    };
    const openContextMenuFromTarget = (target: EventTarget | null, x: number, y: number) => {
        const element = target as HTMLElement | null;
        const messageEl = element?.closest('[data-message-id]') as HTMLElement | null;
        const messageId = messageEl?.dataset.messageId;
        const message = messageId ? messages.find((msg) => msg.id === messageId) : undefined;

        if (message && message.type !== 'system') {
            openMessageMenu(message, x, y);
        } else {
            setContextMenu({ x, y });
        }
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
    const commonEmojis = ['😀', '😊', '😍', '🤣', '😭', '😡', '👍', '👎', '❤️', '💔', '🎉', '🔥', '✨', '💯', '🙏'];

    if (!currentChat || !chatInfo) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{background: 'rgba(255,255,255,0.3)'}}>
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <MessageCircle className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">欢迎使用聊天</h3>
                    <p className="text-gray-600">选择一个对话开始聊天</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex-1 flex flex-col relative"
            onMouseDownCapture={(e) => {
                if (e.button !== 2) return;
                e.preventDefault();
                e.stopPropagation();
                openContextMenuFromTarget(e.target, e.clientX, e.clientY);
            }}
            onContextMenuCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openContextMenuFromTarget(e.target, e.clientX, e.clientY);
            }}
        >
            {/* Header */}
            <div className="chat-header">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="avatar">
                            <img
                                src={chatInfo.avatar}
                                alt={chatInfo.name}
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = chatInfo.name.charAt(0).toUpperCase();
                                }}
                            />
                        </div>
                        {!chatInfo.isGroup && chatInfo.isOnline && ( <div className="status-indicator status-online" /> )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{chatInfo.name}</h3>
                        <p className="text-sm text-gray-600">{chatInfo.status}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {messageHistoryHasMore && (
                        <button
                            type="button"
                            className="btn-ghost tooltip text-xs px-2 py-1"
                            data-tooltip="加载更早消息"
                            onClick={() => { void fetchOlderMessages(); }}
                            disabled={messageHistoryLoading || messages.length === 0}
                        >
                            {messageHistoryLoading ? '加载中...' : '历史↑'}
                        </button>
                    )}
                    {!chatInfo.isGroup && (
                        <>
                            <button className="btn-ghost tooltip" data-tooltip="语音通话"><Phone className="w-5 h-5" /></button>
                            <button className="btn-ghost tooltip" data-tooltip="视频通话"><Video className="w-5 h-5" /></button>
                        </>
                    )}
                    {chatInfo.isGroup && (
                        <>
                            <button
                                className="btn-ghost tooltip"
                                data-tooltip="PigSail来总结噜噜噜"
                                onClick={handleSummarize}
                                disabled={summaryState.loading}
                            >
                                {summaryState.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                            </button>
                            <button className="btn-ghost tooltip" data-tooltip="群组信息"><Users className="w-5 h-5" /></button>
                        </>
                    )}
                    <button className="btn-ghost tooltip" data-tooltip="更多选项"><MoreVertical className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesAreaRef} className="chat-messages" id="messageArea">
                {messageHistoryLoading && (
                    <div className="flex items-center justify-center py-2">
                        <span className="text-xs text-gray-500">加载更早消息...</span>
                    </div>
                )}
                {!messageHistoryLoading && !messageHistoryHasMore && messages.length > 0 && (
                    <div className="flex items-center justify-center py-2">
                        <span className="text-xs text-gray-400">没有更早消息了</span>
                    </div>
                )}
                {/* 群聊摘要横幅 */}
                {chatInfo.isGroup && summaryState.open && (
                    <div className="mb-3 mx-4 p-4 rounded-xl bg-blue-50 border border-blue-100 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4 flex-shrink-0" />
                                    PigSail来总结噜噜噜
                                </div>
                                {summaryState.error ? (
                                    <p className="text-sm text-red-600">{summaryState.error}</p>
                                ) : summaryState.loading && summaryState.text.length === 0 ? (
                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 summary-loader-spin flex-shrink-0" />
                                        PigSail 正在流式输出摘要…
                                    </p>
                                ) : !summaryState.loading && summaryState.text.length === 0 ? (
                                    <p className="text-sm text-slate-500">未收到摘要正文，可关闭后重试。</p>
                                ) : (
                                    <MarkdownBoldText
                                        as="p"
                                        text={summaryState.text}
                                        className="text-sm text-gray-700 leading-relaxed"
                                        style={{ margin: 0 }}
                                    />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={dismissSummary}
                                className="p-1 rounded hover:bg-blue-100 text-gray-500 hover:text-gray-700 transition-colors"
                                title="关闭"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {Object.entries(messageGroups).map(([date, dateMessages]) => (
                    <React.Fragment key={date}>
                        <div className="flex items-center justify-center my-2">
                            <div className="bg-gray-200/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                <span className="text-xs text-gray-600 font-medium">{date}</span>
                            </div>
                        </div>

                        {dateMessages.map((message) => {
                            const isOwn = isOwnMessage(message);

                            // 获取当前消息发送者的头像
                            let senderAvatar = chatInfo.avatar; // 默认对方
                            let senderName = chatInfo.name;

                            if (isOwn) {
                                senderAvatar = user?.avatar || '';
                                senderName = user?.displayName || 'Me';
                            } else if (currentChat.type === 'group') {
                                // 群组里获取具体发送者信息
                                const sender = getUserInfo(message.senderId);
                                if (sender) {
                                    senderAvatar = sender.avatar || '';
                                    senderName = sender.displayName;
                                }
                            }

                            return (
                                <div
                                    key={message.id}
                                    data-message-id={message.id}
                                    className={`message ${isOwn ? 'sent' : ''}`}
                                    onTouchStart={(e) => startLongPressMenu(message, e.touches[0])}
                                    onTouchMove={clearLongPressMenu}
                                    onTouchEnd={clearLongPressMenu}
                                    onMouseEnter={() => setHoveredMessageId(message.id)}
                                    onMouseLeave={() => {
                                        setHoveredMessageId((prev) => prev === message.id ? null : prev);
                                        setReactionPickerForId((prev) => prev === message.id ? null : prev);
                                    }}
                                    ref={(el) => {
                                        if (el) {
                                            messageRefs.current.set(message.id, el);
                                        } else {
                                            messageRefs.current.delete(message.id);
                                        }
                                    }}
                                >
                                    {message.type === 'system' ? (
                                        <div className="w-full text-center my-2">
                                            <span className="text-xs text-gray-500 italic bg-gray-100 px-3 py-1 rounded-full">
                                                <MarkdownBoldText text={message.content} />
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* 头像：自己和对方都显示 */}
                                            <div className="message-avatar" title={senderName}>
                                                <img
                                                    src={senderAvatar}
                                                    alt={senderName}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.parentElement!.innerText = senderName.charAt(0).toUpperCase();
                                                    }}
                                                />
                                            </div>

                                            {/* 消息内容气泡 */}
                                            <div className="message-content">
                                                <div className={`message-actions ${hoveredMessageId === message.id ? 'visible' : ''} ${isOwn ? 'sent' : ''}`}>
                                                    <button
                                                        type="button"
                                                        className="message-action-btn"
                                                        onClick={() => setReplyTarget(message)}
                                                        title="回复"
                                                    >
                                                        <CornerUpLeft className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="message-action-btn"
                                                        onClick={() => setReactionPickerForId(prev => prev === message.id ? null : message.id)}
                                                        title="回应"
                                                    >
                                                        <SmilePlus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                {reactionPickerForId === message.id && (
                                                    <div className={`reaction-picker ${isOwn ? 'sent' : ''}`}>
                                                        {messageQuickReactions.map((emoji) => (
                                                            <button
                                                                key={`${message.id}-picker-${emoji}`}
                                                                type="button"
                                                                className="reaction-picker-btn"
                                                                onClick={() => {
                                                                    if (currentChat) {
                                                                        triggerReactionAnimation(message.id, emoji);
                                                                        toggleMessageReaction(currentChat.id, message.id, emoji);
                                                                    }
                                                                    setReactionPickerForId(null);
                                                                }}
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* 群组中在对方消息上方显示名字 */}
                                                {currentChat.type === 'group' && !isOwn && (
                                                    <div className="text-xs font-bold text-gray-500 mb-1 opacity-80">
                                                        {senderName}
                                                    </div>
                                                )}

                                                {(() => {
                                                    const replyMessage = getReplyMessage(message);
                                                    if (!replyMessage) return null;
                                                    const replySender = getUserInfo(replyMessage.senderId);
                                                    return (
                                                        <button
                                                            type="button"
                                                            className="reply-preview-inline"
                                                            title="点击查看原消息"
                                                            onClick={() => {
                                                                const target = messageRefs.current.get(replyMessage.id);
                                                                if (target) {
                                                                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                }
                                                            }}
                                                        >
                                                            <div className="reply-preview-inline-sender">
                                                                {replySender?.displayName || replySender?.username || '未知用户'}
                                                            </div>
                                                            <div className="reply-preview-inline-quote-row">
                                                                <div className="reply-preview-inline-quote-text">
                                                                    <MarkdownBoldText text={replyMessage.content} />
                                                                </div>
                                                                <span className="reply-preview-inline-chevron" aria-hidden>
                                                                    &gt;
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })()}

                                                <p style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                    <MarkdownBoldText text={message.content} />
                                                    {message.isStreaming && (
                                                        <span
                                                            className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
                                                            style={{ animation: 'blink 0.8s step-start infinite' }}
                                                        />
                                                    )}
                                                </p>

                                                <span className="message-time">
                                                    {message.isStreaming ? '正在输入…' : formatDateTime(new Date(message.timestamp))}
                                                </span>

                                                <div className="message-reactions-row">
                                                    {Object.entries(message.reactions || {}).map(([emoji, userIds]) => (
                                                        <button
                                                            key={`${message.id}-${emoji}`}
                                                            type="button"
                                                            onClick={() => {
                                                                if (currentChat) {
                                                                    triggerReactionAnimation(message.id, emoji);
                                                                    toggleMessageReaction(currentChat.id, message.id, emoji);
                                                                }
                                                            }}
                                                            className={`message-reaction-pill ${hasReacted(message, emoji) ? 'active' : ''} ${animatedReactionKey === `${message.id}-${emoji}` ? 'reaction-pop' : ''}`}
                                                        >
                                                            {emoji} {(userIds as string[]).length}
                                                        </button>
                                                    ))}
                                                    {['👍', '😂', '❤️'].map((emoji) => (
                                                        <button
                                                            key={`${message.id}-quick-${emoji}`}
                                                            type="button"
                                                            onClick={() => {
                                                                if (currentChat) {
                                                                    triggerReactionAnimation(message.id, emoji);
                                                                    toggleMessageReaction(currentChat.id, message.id, emoji);
                                                                }
                                                            }}
                                                            className="message-quick-reaction"
                                                            title={`用 ${emoji} 回应`}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        className="message-reply-btn"
                                                        onClick={() => setReplyTarget(message)}
                                                    >
                                                        回复
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}

                {/* 输入指示器 */}
                {currentTypingUsers.length > 0 && (
                    <div className="message">
                        <div className="message-avatar">
                            <div className="animate-pulse">...</div>
                        </div>
                        <div className="message-content flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {contextMenu && (
                <div
                    className="message-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.message ? (
                        <>
                            <button
                                type="button"
                                className="message-context-item"
                                onClick={() => {
                                    setReplyTarget(contextMenu.message!);
                                    setContextMenu(null);
                                }}
                            >
                                <CornerUpLeft className="w-4 h-4" /> 回复
                            </button>
                            <button
                                type="button"
                                className="message-context-item"
                                onClick={async () => {
                                    await copyMessageContent(contextMenu.message!);
                                    setContextMenu(null);
                                }}
                            >
                                <Copy className="w-4 h-4" /> 复制
                            </button>
                            <div className="message-context-reactions">
                                {messageQuickReactions.map((emoji) => (
                                    <button
                                        key={`context-${contextMenu.message!.id}-${emoji}`}
                                        type="button"
                                        className="message-context-emoji"
                                        onClick={() => {
                                            if (currentChat) {
                                                triggerReactionAnimation(contextMenu.message!.id, emoji);
                                                toggleMessageReaction(currentChat.id, contextMenu.message!.id, emoji);
                                            }
                                            setContextMenu(null);
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            {contextMenu.message.senderId === user?.id && (
                                <button
                                    type="button"
                                    className="message-context-item danger"
                                    onClick={() => {
                                        if (currentChat) {
                                            deleteMessage(currentChat.id, contextMenu.message!.id);
                                        }
                                        setContextMenu(null);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" /> 删除
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="message-context-empty">请在消息上右键查看完整菜单</div>
                    )}
                </div>
            )}

            {/* Input Area */}
            <div className="chat-input-container">
                {replyTarget && (
                    <div className="chat-reply-bar">
                        <div className="text-xs text-gray-500 mb-1">
                            回复 {getUserInfo(replyTarget.senderId)?.displayName || getUserInfo(replyTarget.senderId)?.username || '未知用户'}
                        </div>
                        <div className="reply-preview-inline-quote-row pr-7">
                            <div className="reply-preview-inline-quote-text">{replyTarget.content}</div>
                            <span className="reply-preview-inline-chevron" aria-hidden>
                                &gt;
                            </span>
                        </div>
                        <button
                            type="button"
                            className="chat-reply-bar-close"
                            onClick={() => setReplyTarget(null)}
                        >
                            ×
                        </button>
                    </div>
                )}
                {showEmojiPicker && (
                    <div className="absolute bottom-20 left-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-gray-200 z-50">
                        <div className="grid grid-cols-5 gap-2">
                            {commonEmojis.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => handleEmojiSelect(emoji)}
                                    className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-transform hover:scale-110"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button type="button" className="p-2 text-gray-500 hover:text-blue-500 transition-colors">
                    <Paperclip className="w-6 h-6" />
                </button>

                <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={handleInputChange}
                    placeholder="说点什么..."
                    className="chat-input flex-1 resize-none min-h-[44px] max-h-32"
                    rows={1}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                        }
                    }}
                />

                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-500 hover:text-yellow-500 transition-colors"
                >
                    <Smile className="w-6 h-6" />
                </button>

                <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="send-btn disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    <Send className="w-5 h-5 ml-0.5" />
                </button>
            </div>
        </div>
    );
}