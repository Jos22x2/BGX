import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { Search, UserPlus, MessageSquare, Phone, Video, Users } from 'lucide-react';
import { Profile } from '../../types';

export const ContactsPanel: React.FC<{ onOpenChat?: () => void }> = ({ onOpenChat }) => {
  const { availableProfiles, user } = useAuth();
  const { startDirectChat } = useChat();
  const { startCall } = useCall();
  const [searchTerm, setSearchTerm] = useState('');

  const otherProfiles = availableProfiles.filter(p => p.id !== user?.id);

  const filtered = otherProfiles.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      (p.status_message && p.status_message.toLowerCase().includes(term))
    );
  });

  const handleStartChat = async (targetUser: Profile) => {
    await startDirectChat(targetUser);
    onOpenChat?.();
  };

  const handleStartCall = async (targetUser: Profile, type: 'voice' | 'video') => {
    const chatId = await startDirectChat(targetUser);
    await startCall(targetUser, type, chatId);
  };

  return (
    <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Contactos</h2>
          <p className="text-xs text-slate-500">Directorio de usuarios BGX</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-slate-200/80">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar contactos..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 native-scroll p-2 space-y-1 divide-y divide-slate-100 overscroll-contain">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center">
            <Users className="w-8 h-8 text-slate-300 mb-2" />
            <span className="text-slate-500 font-medium">No se encontraron contactos.</span>
          </div>
        ) : (
          filtered.map((profile) => (
            <div
              key={profile.id}
              className="p-3 rounded-2xl flex items-center justify-between hover:bg-slate-50 active:bg-slate-100/80 transition group gap-3 cursor-pointer"
            >
              <div
                className="flex items-center gap-3 min-w-0 flex-1"
                onClick={() => handleStartChat(profile)}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`}
                    alt={profile.name}
                    className="w-11 h-11 rounded-2xl object-cover border border-slate-200 bg-slate-100"
                  />
                  {profile.is_online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>

                <div className="overflow-hidden min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition">
                    {profile.name}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    {profile.status_message || profile.email}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartChat(profile)}
                  className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 active:scale-95 text-indigo-600 hover:text-white transition cursor-pointer"
                  title="Enviar mensaje"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCall(profile, 'voice')}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-600 active:scale-95 text-slate-600 hover:text-white transition cursor-pointer"
                  title="Llamada de voz"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCall(profile, 'video')}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-600 active:scale-95 text-slate-600 hover:text-white transition cursor-pointer"
                  title="Videollamada"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
