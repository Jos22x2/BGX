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
      id: 'settings' as MainNavView,
      label: 'Ajustes',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP / TABLET VERTICAL NAVIGATION RAIL (md and above - WhatsApp Web style) */}
      {/* ========================================================================= */}
      <aside
        id="main-navigation-rail-desktop"
        aria-label="Navegación principal de escritorio"
        className="hidden md:flex w-16 bg-[#f0f2f5] border-r border-[#e9edef] flex-col items-center py-4 justify-between flex-shrink-0 z-30 select-none h-full"
      >
        {/* Top Section: App Icon & Nav Items */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Brand Logo / Home */}
          <button
            type="button"
            onClick={() => onSelectView('chats')}
            className="w-10 h-10 bg-[#00a884] hover:bg-[#008f6f] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-xs active:scale-95 transition-all cursor-pointer"
            title="BGX Mensajería"
          >
            B
          </button>

          {/* Nav Items */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2 mt-2">
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
                  className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-[#d9fdd3] text-[#00a884] font-bold shadow-2xs'
                      : 'text-[#54656f] hover:text-[#111b21] hover:bg-[#e9edef]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />

                  {/* Badge */}
                  {item.badge !== undefined && (
                    <span
                      id={`rail-badge-${item.id}`}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#25d366] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-2xs"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: User Profile & Sign Out */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {user && (
            <button
              type="button"
              id="user-profile-button"
              onClick={() => onSelectView('settings')}
              className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-[#00a884] transition cursor-pointer active:scale-95"
              title={`${user.name} (Editar perfil)`}
            >
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border border-[#d1d7db]"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#25d366] border-2 border-white" />
            </button>
          )}

          <button
            type="button"
            id="rail-logout-btn"
            onClick={() => signOut()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8696a0] hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE BOTTOM NAVIGATION BAR (< md - WhatsApp Mobile style) */}
      {/* ========================================================================= */}
      {!hideOnMobile && (
        <nav
          id="main-navigation-mobile-bottom"
          aria-label="Navegación móvil inferior"
          className="md:hidden fixed bottom-0 left-0 right-0 bg-[#ffffff] border-t border-[#e9edef] z-30 flex items-center justify-around px-1 py-1.5 safe-pb select-none shadow-[0_-2px_6px_rgba(0,0,0,0.04)]"
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
                className={`relative flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 px-2 rounded-xl transition active:scale-95 cursor-pointer ${
                  isActive ? 'text-[#00a884]' : 'text-[#54656f] hover:text-[#111b21]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {item.badge !== undefined && (
                    <span
                      id={`mobile-badge-${item.id}`}
                      className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 bg-[#25d366] text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white shadow-2xs"
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

          {/* Quick Logout Icon on mobile */}
          <button
            type="button"
            id="mobile-logout-btn"
            onClick={() => signOut()}
            aria-label="Cerrar sesión"
            className="flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 px-2 text-[#8696a0] hover:text-rose-600 active:scale-95 transition cursor-pointer"
          >
            <LogOut className="w-5 h-5 stroke-2" />
            <span className="text-[10px] mt-0.5 font-medium">Salir</span>
          </button>
        </nav>
      )}
    </>
  );
};

