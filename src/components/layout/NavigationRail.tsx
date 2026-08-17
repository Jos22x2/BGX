import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { MessageSquare, Phone, Users, Database, Settings, LogOut } from 'lucide-react';

export type MainNavView = 'chats' | 'calls' | 'contacts' | 'schema' | 'settings';

interface NavigationRailProps {
  activeView: MainNavView;
  onSelectView: (view: MainNavView) => void;
  hideOnMobile?: boolean;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({ activeView, onSelectView, hideOnMobile = false }) => {
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
      label: 'SQL',
      icon: Database,
    },
    {
      id: 'settings' as MainNavView,
      label: 'Ajustes',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP / TABLET VERTICAL NAVIGATION RAIL (md and above) */}
      {/* ========================================================================= */}
      <aside
        id="main-navigation-rail-desktop"
        aria-label="Navegación principal de escritorio"
        className="hidden md:flex w-16 lg:w-20 bg-white border-r border-slate-200 flex-col items-center py-5 justify-between flex-shrink-0 z-30 select-none shadow-xs h-full"
      >
        {/* Top Section: Brand & Profile */}
        <div className="flex flex-col items-center gap-5 w-full">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => onSelectView('chats')}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm active:scale-95 transition cursor-pointer"
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
                className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer active:scale-95"
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
          <nav className="flex flex-col items-center gap-2 w-full px-2 mt-1">
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
                  className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />

                  {/* Badge */}
                  {item.badge !== undefined && (
                    <span
                      id={`rail-badge-${item.id}`}
                      className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-in zoom-in-50 duration-150 ring-2 ring-rose-200"
                    >
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
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE BOTTOM NAVIGATION BAR (< md) */}
      {/* ========================================================================= */}
      {!hideOnMobile && (
        <nav
          id="main-navigation-mobile-bottom"
          aria-label="Navegación móvil inferior"
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-30 flex items-center justify-around px-2 py-1.5 safe-pb select-none shadow-lg"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                id={`mobile-nav-${item.id}`}
                onClick={() => onSelectView(item.id)}
                className={`relative flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition active:scale-90 cursor-pointer ${
                  isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {item.badge !== undefined && (
                    <span
                      id={`mobile-badge-${item.id}`}
                      className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in-50 ring-1 ring-rose-200"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Quick Profile/Logout Icon on mobile */}
          <button
            type="button"
            id="mobile-logout-btn"
            onClick={() => signOut()}
            aria-label="Cerrar sesión"
            className="flex flex-col items-center justify-center min-w-[56px] py-1 px-2 text-slate-400 hover:text-rose-600 active:scale-90 transition cursor-pointer"
          >
            <LogOut className="w-5 h-5 stroke-2" />
            <span className="text-[10px] mt-0.5 font-medium">Salir</span>
          </button>
        </nav>
      )}
    </>
  );
};

