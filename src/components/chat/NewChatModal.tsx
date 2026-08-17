import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { X, Search, MessageSquare, Phone, Video } from 'lucide-react';
import { Profile } from '../../types';

interface NewChatModalProps {
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ onClose }) => {
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

  const handleSelectUser = async (profile: Profile) => {
    await startDirectChat(profile);
    onClose();
  };

  const handleStartCall = async (profile: Profile, type: 'voice' | 'video') => {
    const chatId = await startDirectChat(profile);
    await startCall(profile, type, chatId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-[#ffffff] border-t md:border border-[#e9edef] rounded-t-3xl md:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-150 text-[#111b21] max-h-[88dvh] flex flex-col safe-pb">
        {/* Mobile Drag Indicator */}
        <div className="md:hidden w-full flex items-center justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#d1d7db]" />
        </div>

        {/* Header (WhatsApp style) */}
        <div className="px-5 py-3.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#111b21]">Nuevo Chat</h3>
            <p className="text-xs text-[#667781]">Selecciona un contacto del directorio</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#ffffff] hover:bg-[#e9edef] text-[#54656f] hover:text-[#111b21] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#e9edef]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#54656f] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-[#f0f2f5] hover:bg-[#e9edef] focus:bg-[#ffffff] border border-transparent focus:border-[#00a884] rounded-lg text-sm text-[#111b21] placeholder-[#54656f] focus:outline-none transition"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 max-h-[60vh] native-scroll p-2 divide-y divide-[#e9edef]/80 overscroll-contain">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[#8696a0] text-xs">
              No se encontraron contactos que coincidan.
            </div>
          ) : (
            filtered.map((profile) => (
              <div
                key={profile.id}
                className="p-3 rounded-xl flex items-center justify-between hover:bg-[#f5f6f6] transition gap-3"
              >
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleSelectUser(profile)}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`}
                      alt={profile.name}
                      className="w-11 h-11 rounded-full object-cover bg-[#dfe5e7]"
                    />
                    {profile.is_online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white" />
                    )}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <div className="text-sm font-semibold text-[#111b21] truncate">{profile.name}</div>
                    <div className="text-xs text-[#667781] truncate">{profile.status_message || profile.email}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectUser(profile)}
                    className="p-2 rounded-full bg-[#d9fdd3] hover:bg-[#c2f7b8] text-[#008069] transition cursor-pointer"
                    title="Enviar mensaje"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartCall(profile, 'voice')}
                    className="p-2 rounded-full bg-[#f0f2f5] hover:bg-[#e9edef] text-[#54656f] hover:text-[#00a884] transition cursor-pointer"
                    title="Llamada de voz"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartCall(profile, 'video')}
                    className="p-2 rounded-full bg-[#f0f2f5] hover:bg-[#e9edef] text-[#54656f] hover:text-[#00a884] transition cursor-pointer"
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
    </div>
  );
};
