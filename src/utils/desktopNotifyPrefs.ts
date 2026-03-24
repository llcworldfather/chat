const STORAGE_KEY = 'chat_desktop_notify';

export function isDesktopNotifyEnabled(): boolean {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
    if (Notification.permission !== 'granted') return false;
    return localStorage.getItem(STORAGE_KEY) !== '0';
}

export function setDesktopNotifyEnabled(on: boolean): void {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    window.dispatchEvent(new CustomEvent('chat-desktop-notify-pref'));
}
