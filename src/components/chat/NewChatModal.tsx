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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Nueva Conversación</h3>
            <p className="text-xs text-slate-500">Selecciona un contacto para iniciar</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* User list */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No se encontraron contactos que coincidan.
            </div>
          ) : (
            filtered.map((profile) => (
              <div
                key={profile.id}
                className="p-3 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition gap-3"
              >
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleSelectUser(profile)}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`}
                      alt={profile.name}
                      className="w-10 h-10 rounded-2xl object-cover border border-slate-200 bg-slate-100"
                    />
                    {profile.is_online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{profile.name}</div>
                    <div className="text-xs text-slate-500 truncate">{profile.status_message || profile.email}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectUser(profile)}
                    className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition cursor-pointer"
                    title="Enviar mensaje"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartCall(profile, 'voice')}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-600 text-slate-600 hover:text-white transition cursor-pointer"
                    title="Llamada de voz"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartCall(profile, 'video')}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-600 text-slate-600 hover:text-white transition cursor-pointer"
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
