import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import {
  Phone,
  Video,
  Send,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  ArrowLeft,
  Info,
  Lock,
  X,
  FileText,
  Camera,
  Image,
  Headphones,
  MapPin,
  User,
  Download,
  Play,
  Pause,
  Trash2,
  Mic,
  Search,
  Laptop,
} from 'lucide-react';

interface ConversationViewProps {
  onBack?: () => void;
}

const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🔥', '🎉', '❤️', '👏', '🚀', '💯', '✨'];

interface RichAttachment {
  type: 'image' | 'document' | 'audio' | 'location' | 'contact' | 'call';
  url?: string;
  name?: string;
  size?: string;
  duration?: string;
  caption?: string;
  lat?: number;
  lng?: number;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactId?: string;
  callType?: 'voice' | 'video';
  callStatus?: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended';
  callerId?: string;
  calleeId?: string;
}

const getRichAttachment = (content: string): RichAttachment | null => {
  if (!content) return null;
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && parsed.type) {
        return parsed as RichAttachment;
      }
    } catch {
      // Not JSON
    }
  }
  return null;
};

const AudioPlayer: React.FC<{ url: string; duration?: string }> = ({ url, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error(err));
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2.5 bg-[#f0f2f5] rounded-lg p-2 sm:p-2.5 min-w-[200px] sm:min-w-[240px] select-none">
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white flex items-center justify-center flex-shrink-0 cursor-pointer transition shadow-xs"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="w-full bg-[#dfe5e7] h-1 rounded-full overflow-hidden">
          <div className="bg-[#00a884] h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-[#667781] mt-1">
          <span>Mensaje de voz</span>
          <span>{duration || '0:05'}</span>
        </div>
      </div>
      <div className="text-[#00a884]">
        <Headphones className="w-4 h-4" />
      </div>
    </div>
  );
};

export const ConversationView: React.FC<ConversationViewProps> = ({ onBack }) => {
  const { activeChat, activeChatId, messages, isLoadingMessages, sendMessage, sendTyping, typingUsers, setActiveChatId } = useChat();
  const { user, availableProfiles } = useAuth();
  const { startCall } = useCall();
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  
  // Custom media/asset states
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Custom media/asset refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const peer = activeChat?.other_participant;
  const isPeerTyping = activeChat ? Boolean(typingUsers[activeChat.id]) : false;

  // Webcam snapshot functions
  const startCamera = async () => {
    setIsCameraActive(true);
    setCapturedPhoto(null);
    setShowAttachMenu(false);
    setTimeout(async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          throw new Error('Cámara no compatible');
        }
      } catch (err) {
        console.error('Error al iniciar cámara:', err);
        // Fallback: simulate a picture if camera blocked
        setTimeout(() => {
          setCapturedPhoto(`https://api.dicebear.com/7.x/identicon/svg?seed=camera-${Date.now()}`);
        }, 1500);
      }
    }, 100);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
    setCapturedPhoto(null);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          setCapturedPhoto(dataUrl);
        }
      } catch (err) {
        console.error('Error capturing image:', err);
        setCapturedPhoto(`https://api.dicebear.com/7.x/identicon/svg?seed=camera-${Date.now()}`);
      }
    } else {
      setCapturedPhoto(`https://api.dicebear.com/7.x/identicon/svg?seed=camera-${Date.now()}`);
    }
  };

  const sendCapturedPhoto = async () => {
    if (capturedPhoto) {
      const payload = {
        type: 'image',
        url: capturedPhoto,
        caption: 'Foto de cámara',
      };
      await sendMessage(JSON.stringify(payload));
      stopCamera();
    }
  };

  // Voice Recording functions
  const startRecording = async () => {
    setIsRecordingAudio(true);
    setRecordingSeconds(0);
    setShowAttachMenu(false);
    audioChunksRef.current = [];

    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64Url = event.target?.result as string;
            if (base64Url) {
              const minutes = Math.floor(recordingSeconds / 60);
              const seconds = recordingSeconds % 60;
              const durationFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

              const payload = {
                type: 'audio',
                url: base64Url,
                duration: durationFormatted,
              };
              await sendMessage(JSON.stringify(payload));
            }
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
      } else {
        throw new Error('Micrófono no disponible');
      }
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Simulation fallback if MediaRecorder failed or blocked
      const minutes = Math.floor(recordingSeconds / 60);
      const seconds = recordingSeconds % 60;
      const durationFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      
      const payload = {
        type: 'audio',
        url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        duration: durationFormatted,
      };
      sendMessage(JSON.stringify(payload));
    }

    setIsRecordingAudio(false);
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }

    setIsRecordingAudio(false);
  };

  // Geolocation
  const sendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const payload = {
            type: 'location',
            lat,
            lng,
            address: `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          };
          await sendMessage(JSON.stringify(payload));
          setShowAttachMenu(false);
        },
        async (error) => {
          console.error('Error getting geolocation:', error);
          const payload = {
            type: 'location',
            lat: 40.416775,
            lng: -3.703790,
            address: 'Plaza Mayor, Madrid, España',
          };
          await sendMessage(JSON.stringify(payload));
          setShowAttachMenu(false);
        }
      );
    } else {
      const payload = {
        type: 'location',
        lat: 40.416775,
        lng: -3.703790,
        address: 'Plaza Mayor, Madrid, España',
      };
      sendMessage(JSON.stringify(payload));
      setShowAttachMenu(false);
    }
  };

  // File Inputs Handle
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'document' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      if (!base64Url) return;

      const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

      if (mediaType === 'audio') {
        const audio = new Audio();
        audio.src = base64Url;
        audio.onloadedmetadata = async () => {
          const sec = Math.round(audio.duration) || 5;
          const minutes = Math.floor(sec / 60);
          const seconds = sec % 60;
          const durationFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

          const payload = {
            type: 'audio',
            url: base64Url,
            name: file.name,
            size: sizeFormatted,
            duration: durationFormatted,
          };
          await sendMessage(JSON.stringify(payload));
          setShowAttachMenu(false);
        };
        audio.onerror = async () => {
          const payload = {
            type: 'audio',
            url: base64Url,
            name: file.name,
            size: sizeFormatted,
            duration: '0:05',
          };
          await sendMessage(JSON.stringify(payload));
          setShowAttachMenu(false);
        };
      } else {
        const payload = {
          type: mediaType,
          url: base64Url,
          name: file.name,
          size: sizeFormatted,
        };
        await sendMessage(JSON.stringify(payload));
        setShowAttachMenu(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let mediaType: 'image' | 'document' | 'audio' = 'document';

      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        mediaType = 'image';
      } else if (file.type.startsWith('audio/')) {
        mediaType = 'audio';
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Url = event.target?.result as string;
        if (!base64Url) return;

        const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

        if (mediaType === 'audio') {
          const audio = new Audio();
          audio.src = base64Url;
          audio.onloadedmetadata = async () => {
            const sec = Math.round(audio.duration) || 5;
            const minutes = Math.floor(sec / 60);
            const seconds = sec % 60;
            const durationFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

            const payload = {
              type: 'audio',
              url: base64Url,
              name: file.name,
              size: sizeFormatted,
              duration: durationFormatted,
            };
            await sendMessage(JSON.stringify(payload));
          };
          audio.onerror = async () => {
            const payload = {
              type: 'audio',
              url: base64Url,
              name: file.name,
              size: sizeFormatted,
              duration: '0:05',
            };
            await sendMessage(JSON.stringify(payload));
          };
        } else {
          const payload = {
            type: mediaType,
            url: base64Url,
            name: file.name,
            size: sizeFormatted,
          };
          await sendMessage(JSON.stringify(payload));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Send Contact
  const sendContactCard = async (contact: any) => {
    const payload = {
      type: 'contact',
      contactId: contact.id,
      contactName: contact.name,
      contactEmail: contact.email,
      url: contact.avatar_url,
    };
    await sendMessage(JSON.stringify(payload));
    setShowContactSelector(false);
  };

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [activeChat?.id]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isPeerTyping]);

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    sendTyping(true);

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      sendTyping(false);
    }, 1500);
  };

  // Submit message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const content = inputText;
    setInputText('');
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Group messages by day
  const renderMessageGroups = () => {
    let lastDate = '';

    return messages.map((msg, index) => {
      const msgDate = new Date(msg.created_at).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const showDateDivider = msgDate !== lastDate;
      lastDate = msgDate;

      const isMe = msg.sender_id === user?.id;
      const attachment = getRichAttachment(msg.content);

      return (
        <React.Fragment key={msg.id || index}>
          {showDateDivider && (
            <div className="flex items-center justify-center my-3">
              <span className="px-3 py-1 bg-[#ffffff] rounded-md text-[12px] font-normal text-[#54656f] wa-bubble-shadow select-none">
                {msgDate}
              </span>
            </div>
          )}

          <div
            className={`flex w-full mb-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`relative max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-lg text-[14.2px] leading-relaxed wa-bubble-shadow break-words select-text ${
                isMe
                  ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none'
                  : 'bg-[#ffffff] text-[#111b21] rounded-tl-none'
              }`}
            >
              {/* Rich Attachment Renderer */}
              {attachment ? (
                <div className="pb-1.5 pt-0.5">
                  {attachment.type === 'image' && (
                    <div className="flex flex-col gap-1 max-w-full">
                      <img
                        src={attachment.url}
                        alt={attachment.caption || 'Imagen'}
                        className="rounded-lg object-cover max-h-72 w-full border border-[#e9edef] cursor-pointer"
                        onClick={() => attachment.url && window.open(attachment.url, '_blank')}
                        referrerPolicy="no-referrer"
                      />
                      {attachment.caption && (
                        <p className="text-[13.5px] text-[#111b21] px-1 pt-1 font-medium">{attachment.caption}</p>
                      )}
                    </div>
                  )}

                  {attachment.type === 'document' && (
                    <div
                      onClick={() => attachment.url && window.open(attachment.url, '_blank')}
                      className="flex items-center gap-2.5 bg-[#f0f2f5] hover:bg-[#e9edef] rounded-lg p-2.5 border border-[#e9edef] cursor-pointer select-none transition min-w-[200px] sm:min-w-[240px]"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#24a2f2] flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#111b21] truncate">{attachment.name || 'Documento.pdf'}</p>
                        <p className="text-[10px] text-[#667781]">{attachment.size || 'Archivo'}</p>
                      </div>
                      <div className="p-1.5 rounded-full hover:bg-[#dfe5e7] text-[#54656f]">
                        <Download className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                  {attachment.type === 'audio' && attachment.url && (
                    <AudioPlayer url={attachment.url} duration={attachment.duration} />
                  )}

                  {attachment.type === 'location' && (
                    <div className="flex flex-col rounded-lg overflow-hidden border border-[#e9edef] max-w-[240px] select-none bg-[#f0f2f5]">
                      <div className="h-28 bg-[#cad3d4] relative flex flex-col items-center justify-center text-center text-[#54656f] overflow-hidden">
                        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
                        <div className="absolute top-1/2 left-1/2 w-8 h-8 -mt-6 -ml-4 flex items-center justify-center animate-bounce">
                          <MapPin className="w-8 h-8 text-[#fe2c55] fill-[#fe2c55]/20" />
                        </div>
                        <div className="absolute bottom-2 inset-x-2 bg-white/95 backdrop-blur-xs py-1 px-2 rounded text-[10px] truncate text-slate-800 font-semibold shadow-xs">
                          {attachment.address || 'Ubicación'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.open(`https://www.google.com/maps?q=${attachment.lat},${attachment.lng}`, '_blank')}
                        className="w-full py-2 bg-[#ffffff] hover:bg-[#f0f2f5] text-[#00a884] text-xs font-bold border-t border-[#e9edef] transition cursor-pointer"
                      >
                        Ver en Google Maps
                      </button>
                    </div>
                  )}

                  {attachment.type === 'contact' && (
                    <div className="flex flex-col bg-[#f0f2f5] rounded-lg p-2.5 border border-[#e9edef] min-w-[200px] sm:min-w-[240px] select-none">
                      <div className="flex items-center gap-2.5 mb-2">
                        <img
                          src={attachment.url || `https://api.dicebear.com/7.x/bottts/svg?seed=${attachment.contactId}`}
                          alt={attachment.contactName}
                          className="w-9 h-9 rounded-full bg-white object-cover border border-[#e9edef]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#111b21] truncate">{attachment.contactName}</p>
                          <p className="text-[10px] text-[#667781] truncate">{attachment.contactEmail || 'Contacto BGX'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => attachment.contactId && setActiveChatId(attachment.contactId)}
                        className="w-full py-1.5 bg-[#ffffff] hover:bg-[#00a884] hover:text-white text-[#00a884] text-[11px] font-bold rounded-md border border-[#e9edef] transition cursor-pointer"
                      >
                        Chatear con {attachment.contactName?.split(' ')[0]}
                      </button>
                    </div>
                  )}

                  {attachment.type === 'call' && (
                    <div className="flex flex-col bg-[#f0f2f5] rounded-xl p-3 border border-[#e9edef] min-w-[220px] sm:min-w-[260px] select-none">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          attachment.callStatus === 'missed' || attachment.callStatus === 'rejected'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {attachment.callType === 'video' ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <Phone className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#111b21]">
                            {attachment.callType === 'video' ? 'Videollamada' : 'Llamada de voz'}
                          </p>
                          <p className={`text-[11px] font-medium ${
                            attachment.callStatus === 'missed' || attachment.callStatus === 'rejected'
                              ? 'text-red-500'
                              : 'text-slate-500'
                          }`}>
                            {attachment.callStatus === 'missed' && 'Llamada perdida'}
                            {attachment.callStatus === 'rejected' && 'Llamada rechazada'}
                            {attachment.callStatus === 'ended' && `Finalizada ${attachment.duration ? `(${attachment.duration})` : ''}`}
                          </p>
                        </div>
                      </div>
                      {peer && (
                        <button
                          type="button"
                          onClick={() => startCall(peer, attachment.callType || 'voice', activeChat.id)}
                          className="w-full py-1.5 bg-[#ffffff] hover:bg-[#00a884] hover:text-white text-[#00a884] text-[11px] font-bold rounded-lg border border-[#e9edef] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {attachment.callType === 'video' ? (
                            <Video className="w-3.5 h-3.5" />
                          ) : (
                            <Phone className="w-3.5 h-3.5" />
                          )}
                          <span>Devolver llamada</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap pb-0.5">{msg.content}</p>
              )}

              {/* Timestamp & Status Check in Bottom Right */}
              <div className="flex items-center justify-end gap-1 -mb-0.5 float-right ml-3 text-[11px] text-[#667781] select-none">
                <span>{formatMessageTime(msg.created_at)}</span>
                {isMe && (
                  <span className="inline-flex items-center ml-0.5">
                    {msg.status === 'read' ? (
                      <CheckCheck className="w-4 h-4 text-[#53bdeb]" title="Leído" />
                    ) : msg.status === 'delivered' ? (
                      <CheckCheck className="w-4 h-4 text-[#8696a0]" title="Entregado" />
                    ) : (
                      <Check className="w-4 h-4 text-[#8696a0]" title="Enviado" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  // WhatsApp Web Empty State when no chat is selected at all
  if (!activeChatId) {
    return (
      <main className="flex-1 bg-[#f0f2f5] border-b-[6px] border-[#00a884] hidden md:flex flex-col items-center justify-center p-8 text-center select-none h-full">
        <div className="max-w-md flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-[#dfe5e7]/60 flex items-center justify-center mb-6 text-[#54656f]">
            <Laptop className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-light text-[#41525d] mb-3">BGX para Web</h3>
          <p className="text-[14px] text-[#667781] leading-relaxed mb-8">
            Envía y recibe mensajes, fotos y realiza llamadas de voz o video en tiempo real sin salir de tu navegador.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[#8696a0]">
            <Lock className="w-3.5 h-3.5" />
            <span>Cifrado de extremo a extremo en tiempo real</span>
          </div>
        </div>
      </main>
    );
  }

  // Loading chat state if activeChat is resolving
  if (!activeChat) {
    return (
      <main className="flex-1 flex flex-col h-full bg-[#efeae2] relative w-full">
        <header className="px-3 sm:px-4 py-2.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between z-20 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Volver a los chats"
                className="md:hidden p-1.5 -ml-1 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-[#e9edef] transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5px]" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-[#dfe5e7] animate-pulse" />
            <div className="space-y-1">
              <div className="w-24 h-3.5 bg-[#dfe5e7] rounded-sm animate-pulse" />
              <div className="w-16 h-2.5 bg-[#dfe5e7] rounded-sm animate-pulse" />
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-[#54656f]">
          <span className="w-7 h-7 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold">Cargando conversación...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      id="conversation-panel"
      aria-label="Conversación activa"
      className="flex-1 flex flex-col h-full overflow-hidden relative w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Visual drag over overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#00a884]/15 backdrop-blur-xs border-4 border-dashed border-[#00a884] rounded-2xl m-3 z-50 flex flex-col items-center justify-center gap-4 text-[#00a884] pointer-events-none animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
            <Paperclip className="w-8 h-8 animate-bounce" />
          </div>
          <div className="text-center bg-white/95 px-6 py-4 rounded-2xl shadow-xl border border-emerald-100 max-w-sm">
            <h4 className="text-lg font-bold text-[#111b21] mb-1">Suelta tus archivos aquí</h4>
            <p className="text-xs text-[#667781] leading-relaxed">Puedes arrastrar fotos, vídeos, audios o documentos para enviarlos al instante.</p>
          </div>
        </div>
      )}

      {/* Header (WhatsApp style) */}
      <header className="px-3 sm:px-4 py-2.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between z-20 flex-shrink-0 select-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Back button on mobile */}
          {onBack && (
            <button
              type="button"
              id="mobile-back-to-chats-btn"
              onClick={onBack}
              aria-label="Volver a los chats"
              className="md:hidden p-1.5 -ml-1 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-[#e9edef] transition cursor-pointer active:scale-90"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5px]" />
            </button>
          )}

          {/* Peer Avatar */}
          <div
            className="relative flex-shrink-0 cursor-pointer"
            onClick={() => setShowInfoDrawer(!showInfoDrawer)}
          >
            <img
              src={peer?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer?.id}`}
              alt={peer?.name || 'Contacto'}
              className="w-10 h-10 rounded-full object-cover bg-[#dfe5e7]"
            />
            {peer?.is_online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white" />
            )}
          </div>

          {/* Peer Info */}
          <div className="overflow-hidden min-w-0 cursor-pointer" onClick={() => setShowInfoDrawer(!showInfoDrawer)}>
            <h3
              className="text-[15px] font-semibold text-[#111b21] truncate hover:text-[#00a884] transition"
            >
              {peer?.name || 'Contacto BGX'}
            </h3>
            <div className="text-[12px] text-[#667781] truncate">
              {isPeerTyping ? (
                <span className="text-[#25d366] font-semibold">
                  escribiendo...
                </span>
              ) : peer?.is_online ? (
                <span>en línea</span>
              ) : (
                <span>desconectado</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls (Video Call, Voice Call, Info) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 text-[#54656f]">
          <button
            type="button"
            id="video-call-btn"
            onClick={() => peer && startCall(peer, 'video', activeChat.id)}
            className="p-2 sm:p-2.5 rounded-full hover:bg-[#e9edef] hover:text-[#111b21] transition cursor-pointer active:scale-95"
            title="Videollamada"
          >
            <Video className="w-5 h-5" />
          </button>

          <button
            type="button"
            id="voice-call-btn"
            onClick={() => peer && startCall(peer, 'voice', activeChat.id)}
            className="p-2 sm:p-2.5 rounded-full hover:bg-[#e9edef] hover:text-[#111b21] transition cursor-pointer active:scale-95"
            title="Llamada de voz"
          >
            <Phone className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowInfoDrawer(!showInfoDrawer)}
            className="p-2 sm:p-2.5 rounded-full hover:bg-[#e9edef] hover:text-[#111b21] transition cursor-pointer active:scale-95"
            title="Información del contacto"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area with WhatsApp Wallpaper Pattern */}
      <div className="flex-1 wa-chat-wallpaper native-scroll px-3 sm:px-8 py-3 space-y-1 overscroll-contain">
        {/* End-to-End Encryption Banner at top */}
        <div className="flex justify-center mb-4">
          <div className="max-w-md bg-[#ffeecd] border border-[#f5c368]/40 rounded-lg px-3 py-1.5 text-center text-[11px] text-[#54656f] shadow-2xs select-none flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-[#f59e0b] flex-shrink-0" />
            <span>Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede verlos ni escucharlos.</span>
          </div>
        </div>

        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-3 border-[#00a884] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center text-[#667781] select-none">
            <p className="text-sm font-semibold text-[#111b21]">¡Inicia la conversación!</p>
            <p className="text-xs text-[#667781] mt-1">
              Envía un mensaje para comenzar a chatear en tiempo real.
            </p>
          </div>
        ) : (
          renderMessageGroups()
        )}

        {/* Typing indicator bubble */}
        {isPeerTyping && (
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3.5 py-2 rounded-lg rounded-tl-none bg-[#ffffff] wa-bubble-shadow flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Bar Popover */}
      {showEmojiPicker && (
        <div className="px-3 sm:px-4 py-2 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center gap-2 native-scroll-x z-10">
          <span className="text-xs text-[#54656f] mr-1 font-semibold flex-shrink-0 select-none">Emojis:</span>
          <div className="flex items-center gap-1 flex-nowrap">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleInsertEmoji(emoji)}
                className="p-1.5 hover:bg-[#e9edef] active:scale-125 rounded-lg text-lg transition cursor-pointer flex-shrink-0"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden File inputs for media uploading */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'document')}
      />
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'image')}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'audio')}
      />

      {/* Floating Attach Menu (WhatsApp Web Style) */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-4 bg-white rounded-2xl shadow-xl border border-[#e9edef] p-2 flex flex-col gap-1 z-30 animate-in slide-in-from-bottom duration-150">
          {/* Fotos y Videos */}
          <button
            type="button"
            onClick={() => {
              imageInputRef.current?.click();
              setShowAttachMenu(false);
            }}
            className="flex items-center gap-3 p-2 hover:bg-[#f0f2f5] rounded-xl transition text-left cursor-pointer text-sm font-semibold text-[#111b21] group w-44"
          >
            <div className="w-8 h-8 rounded-full bg-[#bf59ec] text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
              <Image className="w-4 h-4" />
            </div>
            <span>Fotos y Videos</span>
          </button>

          {/* Cámara */}
          <button
            type="button"
            onClick={startCamera}
            className="flex items-center gap-3 p-2 hover:bg-[#f0f2f5] rounded-xl transition text-left cursor-pointer text-sm font-semibold text-[#111b21] group w-44"
          >
            <div className="w-8 h-8 rounded-full bg-[#fe2c55] text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <span>Cámara</span>
          </button>

          {/* Documento */}
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
              setShowAttachMenu(false);
            }}
            className="flex items-center gap-3 p-2 hover:bg-[#f0f2f5] rounded-xl transition text-left cursor-pointer text-sm font-semibold text-[#111b21] group w-44"
          >
            <div className="w-8 h-8 rounded-full bg-[#24a2f2] text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <span>Documento</span>
          </button>

          {/* Subir Audio */}
          <button
            type="button"
            onClick={() => {
              audioInputRef.current?.click();
              setShowAttachMenu(false);
            }}
            className="flex items-center gap-3 p-2 hover:bg-[#f0f2f5] rounded-xl transition text-left cursor-pointer text-sm font-semibold text-[#111b21] group w-44"
          >
            <div className="w-8 h-8 rounded-full bg-[#1ebea5] text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
              <Headphones className="w-4 h-4" />
            </div>
            <span>Subir Audio</span>
          </button>

          {/* Grabador de Voz */}
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-3 p-2 hover:bg-[#f0f2f5] rounded-xl transition text-left cursor-pointer text-sm font-semibold text-[#111b21] group w-44"
          >
            <div className="w-8 h-8 rounded-full bg-[#ff9500] text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
              <Mic className="w-4 h-4" />
            </div>
            <span>Mensaje de voz</span>
          </button>

          {/* Ubicación */}
          <button
            type="button"
            onClick={sendLocation}
            className="flex items-center gap-3 p-2 hover:bg-[#f0f2f5] rounded-xl transition text-left cursor-pointer text-sm font-semibold text-[#111b21] group w-44"
          >
            <div className="w-8 h-8 rounded-full bg-[#1ebea5] text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <span>Ubicación</span>
          </button>

          {/* Contacto */}
          <button
            type="button"
            onClick={() => {
              setShowContactSelector(true);
              setShowAttachMenu(false);
            }}
            className="flex items-center gap-3 p-2 hover:bg-[#f0f2f5] rounded-xl transition text-left cursor-pointer text-sm font-semibold text-[#111b21] group w-44"
          >
            <div className="w-8 h-8 rounded-full bg-[#007aff] text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <span>Contacto</span>
          </button>
        </div>
      )}

      {/* Message Composer Footer (WhatsApp style) */}
      <form
        onSubmit={handleSend}
        id="message-form"
        className="px-2 sm:px-4 py-2.5 bg-[#f0f2f5] border-t border-[#e9edef] flex items-end gap-1.5 sm:gap-2 z-20 safe-pb"
      >
        {isRecordingAudio ? (
          <div className="flex-1 bg-[#ffffff] rounded-lg px-3.5 py-2 flex items-center justify-between shadow-2xs border border-[#e9edef] min-h-[40px] animate-in slide-in-from-bottom duration-100">
            <div className="flex items-center gap-3 text-red-500 font-semibold text-sm select-none">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              <span className="text-[#111b21]">Grabando:</span>
              <span className="text-[#54656f]">
                {Math.floor(recordingSeconds / 60)}:{recordingSeconds % 60 < 10 ? '0' : ''}{recordingSeconds % 60}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600 transition cursor-pointer active:scale-90"
                title="Cancelar grabación"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center hover:bg-[#008f6f] transition cursor-pointer active:scale-90 shadow-xs"
                title="Enviar nota de voz"
              >
                <Check className="w-4 h-4 stroke-[3px]" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 text-[#54656f]">
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowAttachMenu(false);
                }}
                className={`p-2 rounded-full active:scale-90 transition cursor-pointer ${
                  showEmojiPicker ? 'text-[#00a884] bg-[#d9fdd3]' : 'hover:text-[#111b21] hover:bg-[#e9edef]'
                }`}
                title="Emojis"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                type="button"
                id="attach-btn"
                onClick={() => {
                  setShowAttachMenu(!showAttachMenu);
                  setShowEmojiPicker(false);
                }}
                className={`p-2 rounded-full active:scale-90 transition cursor-pointer ${
                  showAttachMenu ? 'text-[#00a884] bg-[#d9fdd3]' : 'hover:text-[#111b21] hover:bg-[#e9edef]'
                }`}
                title="Adjuntar"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>

            {/* Text Input Area */}
            <div className="flex-1 relative min-w-0">
              <textarea
                ref={textareaRef}
                id="message-input"
                rows={1}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje"
                className="w-full max-h-28 min-h-[40px] px-3.5 py-2 bg-[#ffffff] rounded-lg text-[14.5px] text-[#111b21] placeholder-[#54656f] focus:outline-none transition resize-none shadow-2xs border border-transparent focus:border-[#00a884]"
              />
            </div>

            {/* Send Button (WhatsApp green circle) */}
            <button
              type="submit"
              id="send-btn"
              disabled={!inputText.trim()}
              className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white disabled:opacity-40 disabled:hover:bg-[#00a884] transition-all shadow-xs cursor-pointer flex-shrink-0 flex items-center justify-center"
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </>
        )}
      </form>

      {/* Webcam Snapshot Modal Overlay */}
      {isCameraActive && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-4 text-white">
          <div className="max-w-md w-full bg-[#111b21] rounded-2xl border border-white/10 p-5 flex flex-col relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={stopCamera}
              className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition cursor-pointer"
              title="Cerrar cámara"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-base font-bold mb-4 text-center">Cámara BGX</h4>

            <div className="relative rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center border border-white/10">
              {capturedPhoto ? (
                <img
                  src={capturedPhoto}
                  alt="Captured frame"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              {capturedPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCapturedPhoto(null)}
                    className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition cursor-pointer active:scale-95"
                  >
                    Repetir foto
                  </button>
                  <button
                    type="button"
                    onClick={sendCapturedPhoto}
                    className="px-6 py-2 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold text-xs transition cursor-pointer active:scale-95 shadow-lg"
                  >
                    Enviar Foto
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-14 h-14 rounded-full border-4 border-white bg-red-500 hover:bg-red-600 active:scale-90 transition-all cursor-pointer flex items-center justify-center shadow-lg"
                  title="Capturar foto"
                >
                  <span className="w-10 h-10 rounded-full border border-white/50 bg-transparent block" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Contact Selector Modal */}
      {showContactSelector && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs z-40 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85%] border border-[#e9edef] animate-in fade-in zoom-in-95 duration-150 select-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9edef]">
              <h4 className="font-bold text-[#111b21] text-sm">Compartir Contacto</h4>
              <button
                type="button"
                onClick={() => setShowContactSelector(false)}
                className="p-1.5 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-[#f0f2f5] active:scale-95 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contact Search Input */}
            <div className="my-3 relative">
              <input
                type="text"
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                placeholder="Buscar contacto..."
                className="w-full pl-9 pr-4 py-1.5 bg-[#f0f2f5] text-xs text-[#111b21] placeholder-[#54656f] rounded-lg focus:outline-none focus:bg-[#e9edef] border border-transparent focus:border-[#00a884]/30"
              />
              <Search className="w-4 h-4 text-[#54656f] absolute left-3 top-2.5" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 native-scroll pr-1 py-1">
              {availableProfiles
                .filter((p) => p.id !== user?.id)
                .filter((p) => p.name.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                .map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => sendContactCard(profile)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-[#f0f2f5] rounded-xl transition text-left cursor-pointer border border-transparent hover:border-[#e9edef]"
                  >
                    <img
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`}
                      alt={profile.name}
                      className="w-10 h-10 rounded-full object-cover bg-[#dfe5e7]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111b21] truncate">{profile.name}</p>
                      <p className="text-xs text-[#54656f] truncate">{profile.status_message || '¡Hola! Estoy usando BGX.'}</p>
                    </div>
                  </button>
                ))}

              {availableProfiles.filter((p) => p.id !== user?.id).length === 0 && (
                <div className="py-8 text-center text-xs text-[#667781]">
                  No se encontraron contactos disponibles.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Drawer Modal */}
      {showInfoDrawer && peer && (
        <div className="absolute inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-80 bg-[#ffffff] border-l border-[#e9edef] p-6 z-30 shadow-2xl native-scroll animate-in slide-in-from-right duration-150 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#e9edef]">
            <h4 className="font-bold text-[#111b21]">Información del Contacto</h4>
            <button
              type="button"
              onClick={() => setShowInfoDrawer(false)}
              className="p-1.5 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-[#f0f2f5] active:scale-95 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center mb-6">
            <img
              src={peer.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.id}`}
              alt={peer.name}
              className="w-24 h-24 rounded-full object-cover bg-[#dfe5e7] mb-3"
            />
            <h3 className="text-lg font-bold text-[#111b21]">{peer.name}</h3>
            <p className="text-xs text-[#667781] mt-0.5">{peer.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f0f2f5] text-[#54656f]">
              <span className={`w-2 h-2 rounded-full ${peer.is_online ? 'bg-[#25d366]' : 'bg-[#8696a0]'}`} />
              {peer.is_online ? 'En línea' : 'Desconectado'}
            </div>
          </div>

          <div className="space-y-4 flex-1">
            <div className="p-3 bg-[#f0f2f5] rounded-xl">
              <span className="text-[11px] font-bold text-[#54656f] block mb-1">Info / Estado</span>
              <p className="text-xs text-[#111b21]">{peer.status_message || '¡Hola! Estoy usando BGX.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowInfoDrawer(false);
                  startCall(peer, 'voice', activeChat.id);
                }}
                className="p-3 rounded-xl bg-[#f0f2f5] hover:bg-[#e9edef] active:scale-95 text-[#111b21] flex flex-col items-center gap-1 text-xs font-semibold transition cursor-pointer"
              >
                <Phone className="w-5 h-5 text-[#00a884]" />
                Llamar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInfoDrawer(false);
                  startCall(peer, 'video', activeChat.id);
                }}
                className="p-3 rounded-xl bg-[#d9fdd3] hover:bg-[#c2f7b8] active:scale-95 text-[#008069] flex flex-col items-center gap-1 text-xs font-semibold transition cursor-pointer"
              >
                <Video className="w-5 h-5 text-[#00a884]" />
                Videollamada
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
