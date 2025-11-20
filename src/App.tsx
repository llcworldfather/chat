import React from 'react';
import { ChatProvider } from './context/ChatContext';
import { AuthContainer } from './components/Auth/AuthContainer';
import { ChatContainer } from './components/Chat/ChatContainer';
import { useChat } from './context/ChatContext';

function AppContent() {
  const { user } = useChat();

  console.log('AppContent rendering, user:', user);

  return user ? <ChatContainer /> : <AuthContainer />;
}

function App() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}

export default App;