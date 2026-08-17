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

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { activeChatId, setActiveChatId } = useChat();
  const [activeView, setActiveView] = useState<MainNavView>('chats');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-4">
          <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Iniciando BGX...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div id="app" className="h-screen w-screen bg-slate-50 text-slate-900 flex overflow-hidden font-sans antialiased">
      {/* Column 1: Main Navigation Rail */}
      <NavigationRail activeView={activeView} onSelectView={setActiveView} />

      {/* Main Container Area */}
      <div className="flex-1 flex h-full overflow-hidden relative">
        {/* Full-width views: Schema & Settings */}
        {activeView === 'schema' ? (
          <SqlSchemaPanel />
        ) : activeView === 'settings' ? (
          <SettingsPanel />
        ) : (
          /* 2-Column Split: List Panel + Active Conversation View */
          <>
            {/* Column 2: List Panel (Chats / Calls / Contacts) */}
            <div
              className={`h-full ${
                activeChatId ? 'hidden md:flex' : 'flex w-full md:w-auto'
              }`}
            >
              {activeView === 'chats' && <ChatListPanel />}
              {activeView === 'calls' && <CallHistoryPanel />}
              {activeView === 'contacts' && (
                <ContactsPanel onOpenChat={() => setActiveView('chats')} />
              )}
            </div>

            {/* Column 3: Active Conversation Panel */}
            <div
              className={`flex-1 h-full ${
                !activeChatId ? 'hidden md:flex' : 'flex'
              }`}
            >
              <ConversationView onBack={() => setActiveChatId(null)} />
            </div>
          </>
        )}
      </div>

      {/* Overlays: Incoming Call Toast & Fullscreen Call Stage */}
      <IncomingCallModal />
      <ActiveCallOverlay />
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
