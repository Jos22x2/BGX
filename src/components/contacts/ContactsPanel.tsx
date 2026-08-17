import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { Search, MessageSquare, Phone, Video, Users } from 'lucide-react';
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
    <div className="w-full bg-[#ffffff] border-r border-[#e9edef] flex flex-col h-full select-none">
      {/* Header */}
      <div className="px-4 py-3.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111b21] tracking-tight">Contactos</h2>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 pt-2.5 pb-2 bg-[#ffffff] border-b border-[#e9edef]/60">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#54656f] absolute left-3 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar contactos..."
            className="w-full pl-9 pr-4 py-1.5 bg-[#f0f2f5] hover:bg-[#e9edef] focus:bg-[#ffffff] border border-transparent focus:border-[#00a884] rounded-lg text-sm text-[#111b21] placeholder-[#54656f] focus:outline-none transition"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 native-scroll divide-y divide-[#e9edef]/80 overscroll-contain">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#8696a0] text-xs flex flex-col items-center">
            <Users className="w-8 h-8 text-[#aebac1] mb-2" />
            <span className="text-[#111b21] font-semibold text-sm">No se encontraron contactos</span>
            <p className="text-[#667781] text-xs mt-1">Intenta con otro término de búsqueda.</p>
          </div>
        ) : (
          filtered.map((profile) => (
            <div
              key={profile.id}
              className="px-3.5 py-3 flex items-center justify-between hover:bg-[#f5f6f6] transition group gap-3 cursor-pointer"
            >
              <div
                className="flex items-center gap-3.5 min-w-0 flex-1"
                onClick={() => handleStartChat(profile)}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`}
                    alt={profile.name}
                    className="w-12 h-12 rounded-full object-cover bg-[#dfe5e7]"
                  />
                  {profile.is_online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white" />
                  )}
                </div>

                <div className="overflow-hidden min-w-0">
                  <h4 className="text-[15px] font-semibold text-[#111b21] truncate group-hover:text-[#00a884] transition">
                    {profile.name}
                  </h4>
                  <p className="text-[13px] text-[#667781] truncate">
                    {profile.status_message || profile.email}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0 text-[#54656f]">
                <button
                  type="button"
                  onClick={() => handleStartChat(profile)}
                  className="p-2 rounded-full hover:bg-[#e9edef] hover:text-[#00a884] transition cursor-pointer"
                  title="Mensaje"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCall(profile, 'voice')}
                  className="p-2 rounded-full hover:bg-[#e9edef] hover:text-[#00a884] transition cursor-pointer"
                  title="Llamada de voz"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCall(profile, 'video')}
                  className="p-2 rounded-full hover:bg-[#e9edef] hover:text-[#00a884] transition cursor-pointer"
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
