import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChat } from '../context/ChatContext';
import { socketService } from '../services/socket';
import type { Chat, Message, SocketUser, User } from '../types';
import { previewMessageContent } from '../utils/messagePreview';
import { isDesktopNotifyEnabled } from '../utils/desktopNotifyPrefs';

const BASE_TITLE = 'pigsail';

type ToastItem = { id: string; chatId: string; title: string; body: string };

function resolveChatTitle(
    chat: Chat | undefined,
    userId: string | undefined,
    getUserInfo: (id: string) => User | SocketUser | undefined
): string {
    if (!chat || !userId) return '聊天';
    if (chat.type === 'group') return chat.name || '群聊';
    const otherId = chat.participants.find((id) => id !== userId);
    const other = otherId ? getUserInfo(otherId) : undefined;
    const isPigsail =
        (other?.username || '').toLowerCase() === 'pigsail' ||
        (other?.displayName || '').toLowerCase() === 'pigsail';
    if (isPigsail) return chat.name || other?.displayName || 'PigSail';
    return other ? other.displayName || other.username || '私聊' : '私聊';
}

function senderLabel(message: Message, getUserInfo: (id: string) => User | SocketUser | undefined): string {
    if (message.senderId === 'system') return '系统';
    const u = getUserInfo(message.senderId);
    return u?.displayName || u?.username || '新消息';
}

export function MessageAlertHost() {
    const { user, chats, currentChat, setCurrentChat, getUserInfo } = useChat();
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [docHidden, setDocHidden] = useState(() =>
        typeof document !== 'undefined' ? document.hidden : false
    );

    const chatsRef = useRef(chats);
    const currentChatRef = useRef(currentChat);
    const userRef = useRef(user);
    const getUserInfoRef = useRef(getUserInfo);
    const setCurrentChatRef = useRef(setCurrentChat);

    chatsRef.current = chats;
    currentChatRef.current = currentChat;
    userRef.current = user;
    getUserInfoRef.current = getUserInfo;
    setCurrentChatRef.current = setCurrentChat;

    useEffect(() => {
        const onVis = () => setDocHidden(document.hidden);
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const pushToast = useCallback((item: ToastItem) => {
        setToasts((prev) => {
            const next = [...prev.filter((t) => t.id !== item.id), item];
            return next.slice(-5);
        });
        window.setTimeout(() => dismissToast(item.id), 5200);
    }, [dismissToast]);

    // 标题：未读数量 + 后台时闪烁
    useEffect(() => {
        if (!user?.id) {
            document.title = BASE_TITLE;
            return;
        }

        const userId = user.id;
        let intervalId: number | undefined;

        const totalUnread = (): number =>
            chatsRef.current.reduce((sum, c) => sum + (c.unreadCounts?.get(userId) || 0), 0);

        const clearFlash = () => {
            if (intervalId !== undefined) {
                window.clearInterval(intervalId);
                intervalId = undefined;
            }
        };

        const applyTitle = () => {
            const total = totalUnread();
            if (document.visibilityState === 'hidden' && total > 0) {
                clearFlash();
                let flip = false;
                intervalId = window.setInterval(() => {
                    flip = !flip;
                    const t = totalUnread();
                    if (t === 0) {
                        clearFlash();
                        document.title = BASE_TITLE;
                        return;
                    }
                    document.title = flip ? `【新消息】(${t}) ${BASE_TITLE}` : `(${t}) ${BASE_TITLE}`;
                }, 1000);
            } else {
                clearFlash();
                document.title = total > 0 ? `(${total}) ${BASE_TITLE}` : BASE_TITLE;
            }
        };

        applyTitle();

        return () => {
            clearFlash();
            document.title = BASE_TITLE;
        };
    }, [user?.id, chats, docHidden]);

    // 新消息 → Toast + 桌面通知
    useEffect(() => {
        if (!user?.id) return;

        const handleNewMessage = (message: Message) => {
            const me = userRef.current;
            if (!me?.id) return;
            if (message.type === 'system') return;
            if (String(message.senderId) === String(me.id)) return;

            const current = currentChatRef.current;
            const list = chatsRef.current;
            const chat = list.find((c) => c.id === message.chatId);
            const chatTitle = resolveChatTitle(chat, me.id, getUserInfoRef.current);
            const from = senderLabel(message, getUserInfoRef.current);
            const body = previewMessageContent(message);
            const tabHidden = document.visibilityState === 'hidden';
            const sameChatOpen = current?.id === message.chatId;
            const shouldSurface = !sameChatOpen || tabHidden;

            if (shouldSurface) {
                pushToast({
                    id: message.id,
                    chatId: message.chatId,
                    title: chatTitle,
                    body: `${from}: ${body}`
                });
            }

            if (shouldSurface && isDesktopNotifyEnabled()) {
                try {
                    const pub = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
                    const icon =
                        typeof window !== 'undefined'
                            ? `${window.location.origin}${pub}/pigsail-icon.png`
                            : undefined;
                    const n = new Notification(`${from} · ${chatTitle}`, {
                        body,
                        icon: icon || undefined,
                        tag: message.chatId
                    });
                    n.onclick = () => {
                        window.focus();
                        n.close();
                        const c = chatsRef.current.find((x) => x.id === message.chatId);
                        if (c) setCurrentChatRef.current(c);
                    };
                } catch {
                    /* ignore */
                }
            }
        };

        socketService.onNewMessage(handleNewMessage);
        return () => {
            socketService.off('new_message', handleNewMessage);
        };
    }, [user?.id, pushToast]);

    if (!user?.id) return null;

    const layer = (
        <div
            className="fixed bottom-4 right-4 z-[10050] flex flex-col gap-2 pointer-events-none max-w-sm w-[min(100vw-2rem,360px)]"
            aria-live="polite"
        >
            {toasts.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                        const c = chats.find((x) => x.id === t.chatId);
                        if (c) setCurrentChat(c);
                        dismissToast(t.id);
                    }}
                    className="pointer-events-auto text-left rounded-lg border border-gray-200 bg-white shadow-lg px-4 py-3 hover:bg-gray-50 transition-colors message-toast-enter"
                >
                    <div className="font-semibold text-gray-900 text-sm truncate">{t.title}</div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-3">{t.body}</div>
                </button>
            ))}
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : null;
}
