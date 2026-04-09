import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { apiService } from './api';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let lastRegisteredToken: string | null = null;
/** Avoid registering multiple onMessage listeners when initFcmAndRegisterToken runs more than once */
let foregroundFcmListenerAttached = false;

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  if (v === undefined || v === null) return undefined;
  const t = String(v).trim();
  return t.length ? t : undefined;
}

function getFirebaseConfig() {
  return {
    apiKey: readEnv('REACT_APP_FIREBASE_API_KEY'),
    authDomain: readEnv('REACT_APP_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('REACT_APP_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('REACT_APP_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('REACT_APP_FIREBASE_APP_ID')
  };
}

function configReady(c: ReturnType<typeof getFirebaseConfig>): boolean {
  return !!(
    c.apiKey &&
    c.projectId &&
    c.messagingSenderId &&
    c.appId
  );
}

function missingFirebaseEnvKeys(): string[] {
  const c = getFirebaseConfig();
  const keys: string[] = [];
  if (!c.apiKey) keys.push('REACT_APP_FIREBASE_API_KEY');
  if (!c.projectId) keys.push('REACT_APP_FIREBASE_PROJECT_ID');
  if (!c.messagingSenderId) keys.push('REACT_APP_FIREBASE_MESSAGING_SENDER_ID');
  if (!c.appId) keys.push('REACT_APP_FIREBASE_APP_ID');
  return keys;
}

/**
 * After login / session restore: request notification permission, obtain FCM token, register on server.
 * No-op if env incomplete, unsupported, or permission denied.
 */
export async function initFcmAndRegisterToken(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const supported = await isSupported().catch(() => false);
  if (!supported) return;

  const config = getFirebaseConfig();
  if (!configReady(config)) {
    const missing = missingFirebaseEnvKeys();
    console.warn(
      `FCM: missing or empty env: ${missing.join(', ') || '(unknown)'}. ` +
        'Put them in client/.env.development (for npm start) or client/.env, then restart the dev server. ' +
        'If you use .env.local, remove empty REACT_APP_FIREBASE_* entries there — CRA will not override already-set vars.'
    );
    return;
  }

  const vapidKey = process.env.REACT_APP_FCM_VAPID_KEY?.trim();
  if (!vapidKey) {
    console.warn('FCM: REACT_APP_FCM_VAPID_KEY is not set');
    return;
  }

  if (typeof Notification === 'undefined') return;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return;

  try {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  } catch (e) {
    console.warn('FCM: service worker registration failed', e);
    return;
  }

  if (!app) {
    app = initializeApp({
      apiKey: config.apiKey!,
      authDomain: config.authDomain,
      projectId: config.projectId!,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId!,
      appId: config.appId!
    });
  }
  if (!messaging) {
    messaging = getMessaging(app);
  }

  let token: string;
  try {
    token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: await navigator.serviceWorker.ready });
  } catch (e) {
    console.warn('FCM: getToken failed', e);
    return;
  }

  if (!token) return;

  lastRegisteredToken = token;
  try {
    await apiService.registerFcmToken(token);
    console.info('FCM: device token registered with server (offline push enabled for this browser)');
  } catch (e) {
    console.warn('FCM: server registration failed', e);
  }

  // 页面在前台时 FCM 不会走 SW 的 onBackgroundMessage；若此时 Socket 已断，服务端仍会发 FCM，必须在 onMessage 里弹出通知，否则会「success=1 但看不见推送」。
  if (!foregroundFcmListenerAttached) {
    foregroundFcmListenerAttached = true;
    onMessage(messaging, (payload) => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const title =
        payload.notification?.title ||
        (payload.data && (payload.data as Record<string, string>).title) ||
        '新消息';
      const body =
        payload.notification?.body ||
        (payload.data && (payload.data as Record<string, string>).body) ||
        '';
      const tag =
        (payload.data && (payload.data as Record<string, string>).messageId) ||
        payload.messageId ||
        'fcm-chat';
      try {
        const n = new Notification(title, { body, tag });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch (e) {
        console.warn('FCM: foreground Notification() failed', e);
      }
    });
  }
}

export async function unregisterFcmTokenOnLogout(): Promise<void> {
  if (!lastRegisteredToken) return;
  const t = lastRegisteredToken;
  lastRegisteredToken = null;
  try {
    await apiService.unregisterFcmToken(t);
  } catch {
    /* ignore */
  }
}
