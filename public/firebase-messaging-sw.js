/* global importScripts, firebase */
// Version must match client dependency "firebase" in package.json (currently 11.6.0).
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

// 须与 .env 中 REACT_APP_FIREBASE_* 一致；apiKey / appId 从 Firebase 控制台 Web 应用 SDK 配置粘贴。
firebase.initializeApp({
  apiKey: 'AIzaSyCmMj-tHrVnHzvNC3TaQBkYPnIgRj9GWA0',
  authDomain: 'pigsail-f5664.firebaseapp.com',
  projectId: 'pigsail-f5664',
  storageBucket: 'pigsail-f5664.firebasestorage.app',
  messagingSenderId: '750441221918',
  appId: '1:750441221918:web:bddbf42aa797b28fa8430f'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const title =
    (payload.notification && payload.notification.title) ||
    d.title ||
    '新消息';
  const body =
    (payload.notification && payload.notification.body) ||
    d.body ||
    '';
  const options = {
    body,
    icon: '/pigsail-icon.png',
    badge: '/pigsail-icon.png',
    tag: d.messageId || 'chat-fcm',
    renotify: true,
    data: d
  };
  return self.registration.showNotification(title, options);
});
