import type { Message } from '../types';

export function previewMessageContent(message: Pick<Message, 'type' | 'content'>): string {
    if (message.type === 'system') return '[系统消息]';
    if (message.type === 'emoji') return message.content || '[表情]';
    const t = (message.content || '').trim();
    if (!t) return '[消息]';
    return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}
