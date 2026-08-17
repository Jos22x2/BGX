import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { NavigationRail, MainNavView } from './components/layout/NavigationRail';
import { ChatListPanel } from './components/chat/ChatListPanel';
import { ConversationView } from './components/chat/ConversationView';
import { CallHistoryPanel } from './components/calls/CallHistoryPanel';
import { ContactsPanel } from './components/contacts/ContactsPanel';
import { SqlSchemaPanel } from './components/modals/SqlSchemaPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { IncomingCallModal } from './components/calls/IncomingCallModal';
import { ActiveCallOverlay } from './components/calls/ActiveCallOverlay';
import { DatabaseErrorModal } from './components/modals/DatabaseErrorModal';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { activeChatId, setActiveChatId } = useChat();
  const [activeView, setActiveView] = useState<MainNavView>('chats');

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center text-slate-900">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-4 shadow-sm">
          <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Iniciando BGX...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // When activeChatId exists on mobile (< md), we hide the bottom navigation rail to allow full-screen chat
  const isChatOpenOnMobile = Boolean(activeChatId && activeView === 'chats');

  return (
    <div
      id="app"
      className="h-[100dvh] w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row overflow-hidden font-sans antialiased"
    >
      {/* 1. Main Navigation: Desktop rail & Mobile bottom bar */}
      <NavigationRail
        activeView={activeView}
        onSelectView={(v) => {
          setActiveView(v);
          if (v !== 'chats') {
            setActiveChatId(null);
          }
        }}
        hideOnMobile={isChatOpenOnMobile}
      />

      {/* 2. Main Content View Area */}
      <main className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
        {/* Views: Schema & Settings */}
        {activeView === 'schema' ? (
          <div className="flex-1 h-full pb-14 md:pb-0 overflow-hidden">
            <SqlSchemaPanel />
          </div>
        ) : activeView === 'settings' ? (
          <div className="flex-1 h-full pb-14 md:pb-0 overflow-hidden">
            <SettingsPanel />
          </div>
        ) : (
          /* Master-Detail (Chats, Calls, Contacts + Active Conversation) */
          <>
            {/* Left/List Panel */}
            <div
              className={`h-full ${
                activeChatId
                  ? 'hidden md:flex md:w-80 lg:w-96 flex-shrink-0'
                  : 'flex w-full md:w-80 lg:w-96 flex-shrink-0 pb-14 md:pb-0'
              }`}
            >
              {activeView === 'chats' && <ChatListPanel />}
              {activeView === 'calls' && <CallHistoryPanel />}
              {activeView === 'contacts' && (
                <ContactsPanel onOpenChat={() => setActiveView('chats')} />
              )}
            </div>

            {/* Right/Detail Conversation View */}
            <div
              className={`flex-1 h-full overflow-hidden ${
                !activeChatId ? 'hidden md:flex' : 'flex w-full'
              }`}
            >
              <ConversationView onBack={() => setActiveChatId(null)} />
            </div>
          </>
        )}
      </main>

      {/* 3. Overlays: Incoming Call Toast & Fullscreen WebRTC Call Stage */}
      <IncomingCallModal />
      <ActiveCallOverlay />
      <DatabaseErrorModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <CallProvider>
          <MainAppContent />
        </CallProvider>
      </ChatProvider>
    </AuthProvider>
  );
}

