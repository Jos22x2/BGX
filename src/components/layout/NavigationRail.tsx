import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { MessageSquare, Phone, Users, Database, Settings, LogOut } from 'lucide-react';

export type MainNavView = 'chats' | 'calls' | 'contacts' | 'schema' | 'settings';

interface NavigationRailProps {
  activeView: MainNavView;
  onSelectView: (view: MainNavView) => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({ activeView, onSelectView }) => {
  const { user, signOut } = useAuth();
  const { chats } = useChat();
  const { callHistory } = useCall();

  const totalUnreadMessages = chats.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const missedCallsCount = callHistory.filter(c => c.status === 'missed').length;

  const navItems = [
    {
      id: 'chats' as MainNavView,
      label: 'Chats',
      icon: MessageSquare,
      badge: totalUnreadMessages > 0 ? totalUnreadMessages : undefined,
    },
    {
      id: 'calls' as MainNavView,
      label: 'Llamadas',
      icon: Phone,
      badge: missedCallsCount > 0 ? missedCallsCount : undefined,
    },
    {
      id: 'contacts' as MainNavView,
      label: 'Contactos',
      icon: Users,
    },
    {
      id: 'schema' as MainNavView,
      label: 'Esquema SQL',
      icon: Database,
    },
    {
      id: 'settings' as MainNavView,
      label: 'Ajustes',
      icon: Settings,
    },
  ];

  return (
    <aside
      id="main-navigation-rail"
      aria-label="Navegación principal"
      className="w-16 sm:w-20 bg-white border-r border-slate-200 flex flex-col items-center py-5 justify-between flex-shrink-0 z-30 select-none shadow-xs"
    >
      {/* Top Section: Brand & Profile */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Brand Logo */}
        <button
          type="button"
          onClick={() => onSelectView('chats')}
          className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm hover:bg-indigo-700 transition"
          title="BGX Mensajería"
        >
          B
        </button>

        {/* User Avatar with status dot */}
        {user && (
          <div className="relative group">
            <button
              type="button"
              id="user-profile-button"
              onClick={() => onSelectView('settings')}
              className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              title={`${user.name} (Editar perfil)`}
            >
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 hover:border-indigo-600 transition"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-2 w-full px-2 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                id={`rail-nav-${item.id}`}
                onClick={() => onSelectView(item.id)}
                aria-label={item.label}
                title={item.label}
                className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />

                {/* Badge */}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Sign Out */}
      <div className="flex flex-col items-center w-full px-2">
        <button
          type="button"
          id="rail-logout-btn"
          onClick={() => signOut()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};
