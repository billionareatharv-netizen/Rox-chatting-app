import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message, PollData } from '../../types';
import { MessageBubble } from './MessageBubble';
import { GroupInfoModal } from './GroupInfoModal';
import { MediaViewer } from './MediaViewer';
import { getAIResponse } from '../../gemini';
import { 
  getUserById, 
  addMessage, 
  getMessages, 
  toggleChatLock, 
  editMessage, 
  deleteMessageForEveryone, 
  deleteMessageForMe, 
  subscribeToChat, 
  subscribeToUser, 
  togglePinMessage, 
  setTypingStatus,
  getMyChats,
  getAllUsers
} from '../../firebase';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  onClose: () => void;
  onUserClick: (user: User) => void;
  onCallStart?: (user: User, type: 'voice' | 'video') => void;
}

const STICKERS = [
    'https://cdn-icons-png.flaticon.com/512/742/742751.png',
    'https://cdn-icons-png.flaticon.com/512/742/742752.png',
    'https://cdn-icons-png.flaticon.com/512/742/742923.png',
    'https://cdn-icons-png.flaticon.com/512/742/742823.png',
    'https://cdn-icons-png.flaticon.com/512/742/742760.png',
    'https://cdn-icons-png.flaticon.com/512/742/742940.png',
    'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
    'https://cdn-icons-png.flaticon.com/512/4712/4712139.png',
];

const WALLPAPER_CLASSES: Record<string, string> = {
  default: 'bg-slate-100 dark:bg-slate-950',
  indigo: 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/40 dark:to-purple-900/40',
  emerald: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/40 dark:to-teal-900/40',
  rose: 'bg-gradient-to-br from-rose-500/10 to-pink-500/10 dark:from-rose-900/40 dark:to-pink-900/40',
  amber: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-900/40 dark:to-orange-900/40',
  dark: 'bg-slate-950',
  gradient: 'bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-slate-900 dark:to-indigo-950',
};

const FONT_SIZE_CLASSES: Record<string, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
};

// --- SAFE CONSTANTS (PREVENTS REGEX ERRORS) ---
const ACCEPTED_MEDIA = "image/png,image/jpeg,image/gif,video/mp4,video/webm";
const BG_PATTERN = "https://www.transparenttextures.com/patterns/cubes.png"; // Cleaner pattern
const MIME_WEBM_OPUS = "audio/webm;codecs=opus";
const MIME_MP4 = "audio/mp4";
const MIME_WEBM = "audio/webm";
const PREFIX_IMAGE = "image/";
const PREFIX_VIDEO = "video/";
const AI_CMD = "/ai";
const AI_BOT_ID = "gemini_ai";

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, currentUser, onClose, onUserClick, onCallStart }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isLocked, setIsLocked] = useState(chat.lockedBy?.includes(currentUser.uid) || false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);

  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

  const [viewingMedia, setViewingMedia] = useState<Message | null>(null);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const [wallpaper, setWallpaper] = useState('default');
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState('medium');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [availableChats, setAvailableChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const isGroup = chat.type === 'group';
  const participants = chat.participants || [];
  const otherId = !isGroup && participants.length > 0
    ? (participants.find(p => p !== currentUser.uid) || (participants.includes(currentUser.uid) ? currentUser.uid : '')) 
    : chat.id;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('roxx_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setWallpaper(parsed.wallpaper || 'default');
        setCustomUrl(parsed.customWallpaperUrl || null);
        setFontSize(parsed.fontSize || 'medium');
      }
    } catch (e) {
      console.warn("Settings corrupted, resetting");
      localStorage.removeItem('roxx_settings');
      setWallpaper('default');
    }
  };

  useEffect(() => {
    loadSettings();
    window.addEventListener('roxx_settings_updated', loadSettings);
    return () => window.removeEventListener('roxx_settings_updated', loadSettings);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToChat(chat.id, (data) => {
      if (data.typing) {
        const activeTypers = Object.entries(data.typing)
          .filter(([uid, isTyping]) => uid !== currentUser.uid && isTyping)
          .map(([uid]) => uid);
        setTypingUsers(activeTypers);
      } else {
        setTypingUsers([]);
      }
      if (data.pinnedMessages) {
        setPinnedMessageIds(data.pinnedMessages);
      } else {
        setPinnedMessageIds([]);
      }
    });
    return () => unsubscribe();
  }, [chat.id, currentUser.uid]);

  useEffect(() => {
    if (isGroup || !otherId) return;
    
    getUserById(otherId).then(u => { 
        if(u) {
            setOtherUser(u); 
            setIsBlockedByThem(u.blockedUsers?.includes(currentUser.uid) || false);
        }
    });

    setIsBlockedByMe(currentUser.blockedUsers?.includes(otherId) || false);

    const unsubscribe = subscribeToUser(otherId, (userData) => {
        setOtherUser(userData);
        setIsBlockedByThem(userData.blockedUsers?.includes(currentUser.uid) || false);
    });
    return () => unsubscribe();
  }, [otherId, isGroup, currentUser.uid, currentUser.blockedUsers]);

  useEffect(() => {
    const sync = async () => {
      const msgs = await getMessages(chat.id);
      setMessages(prev => {
        if (JSON.stringify(msgs) !== JSON.stringify(prev)) return msgs;
        return prev;
      });
    };
    sync();
    const itv = setInterval(sync, 1500); 
    return () => clearInterval(itv);
  }, [chat.id]);

  useEffect(() => {
    if (scrollRef.current) {
      // Small timeout to allow images to render
      setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }
      }, 100);
    }
  }, [messages.length, isTyping, replyingTo, editingMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      setTypingStatus(chat.id, currentUser.uid, true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(chat.id, currentUser.uid, false);
    }, 2000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = MIME_WEBM;
      if (MediaRecorder.isTypeSupported(MIME_WEBM_OPUS)) mimeType = MIME_WEBM_OPUS;
      else if (MediaRecorder.isTypeSupported(MIME_MP4)) mimeType = MIME_MP4;

      const recorder = new MediaRecorder(stream, { mimeType });
      setMediaRecorder(recorder);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) { alert("Microphone access denied."); }
  };

  const stopRecording = async (shouldSend: boolean) => {
    if (mediaRecorder && isRecording) {
      const mimeType = mediaRecorder.mimeType || MIME_WEBM;
      mediaRecorder.onstop = async () => {
        if (shouldSend && audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: mimeType });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64Audio = reader.result as string;
                const msg: Message = {
                    id: 'v_' + Math.random().toString(36).substring(2, 11),
                    senderId: currentUser.uid,
                    recipientId: isGroup ? chat.id : otherId!,
                    text: 'Voice Message',
                    type: 'voice',
                    timestamp: Date.now(),
                    status: 'sent',
                    audioUrl: base64Audio,
                    duration: recordingDuration
                };
                setMessages(prev => [...prev, msg]);
                await addMessage(msg);
            };
        }
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        setMediaRecorder(null);
        audioChunksRef.current = [];
      };
      mediaRecorder.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const triggerDeleteFlow = (msg: Message) => {
      setMessageToDelete(msg);
      setShowDeleteOptions(true);
  };

  const confirmDelete = async (type: 'me' | 'everyone') => {
      if (!messageToDelete) return;
      if (window.confirm(type === 'everyone' ? "Delete for everyone?" : "Delete for me?")) {
          if (type === 'everyone') {
              setMessages(prev => prev.map(m => m.id === messageToDelete.id ? { ...m, type: 'deleted', text: '🚫 This message was deleted' } : m));
              await deleteMessageForEveryone(messageToDelete.id);
          } else {
              setMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
              await deleteMessageForMe(messageToDelete.id, currentUser.uid);
          }
      }
      setShowDeleteOptions(false);
      setMessageToDelete(null);
  };

  const handlePinMessage = async (msg: Message) => {
      await togglePinMessage(chat.id, msg.id);
  };

  const handleEditMessage = (msg: Message) => {
      setEditingMessage(msg);
      setInputText(msg.text);
      inputRef.current?.focus();
  };

  const handleMediaClick = (msg: Message) => {
      setViewingMedia(msg);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    setTypingStatus(chat.id, currentUser.uid, false);

    if (editingMessage) {
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, text: text, isEdited: true } : m));
        await editMessage(editingMessage.id, text);
        setEditingMessage(null);
        setInputText('');
        return;
    }
    
    const recipient = isGroup ? chat.id : otherId;
    if (!recipient) return;

    if (!isGroup && (isBlockedByMe || isBlockedByThem)) {
        if (isBlockedByMe) {
            if(!window.confirm("You blocked this user. Unblock to send message?")) return;
        }
    }

    let replyContext = undefined;
    if (replyingTo) {
      const sender = await getUserById(replyingTo.senderId);
      replyContext = {
        messageId: replyingTo.id,
        text: replyingTo.text || 'Media',
        senderName: sender?.name || 'User'
      };
    }

    const msg: Message = {
      id: 'm_' + Math.random().toString(36).substring(2, 11),
      senderId: currentUser.uid, 
      recipientId: recipient,
      text, 
      type: 'text', 
      timestamp: Date.now(), 
      status: 'sent',
      replyContext
    };

    setMessages(prev => [...prev, msg]);
    setInputText('');
    setReplyingTo(null);
    
    await addMessage(msg);

    if (text.toLowerCase().startsWith(AI_CMD)) {
      setTypingUsers(prev => [...prev, AI_BOT_ID]);
      try {
        const promptText = text.slice(AI_CMD.length).trim(); 
        const res = await getAIResponse(promptText);
        const aiMsg: Message = {
          id: 'ai_' + Date.now(), 
          senderId: AI_BOT_ID, 
          recipientId: isGroup ? chat.id : currentUser.uid,
          text: res || "I'm thinking...", 
          type: 'text', 
          timestamp: Date.now(), 
          status: 'seen'
        };
        await addMessage(aiMsg);
      } catch (err) { }
      finally { setTypingUsers(prev => prev.filter(id => id !== AI_BOT_ID)); }
    }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    
    const poll: PollData = {
        question: pollQuestion,
        options: pollOptions.filter(o => o.trim()).map((text, i) => ({
            id: `opt_${i}`,
            text,
            votes: []
        })),
        allowMultiple: false
    };

    const recipient = isGroup ? chat.id : otherId!;
    const msg: Message = {
        id: 'poll_' + Math.random().toString(36).substring(2, 11),
        senderId: currentUser.uid,
        recipientId: recipient,
        text: '📊 Poll',
        type: 'poll',
        timestamp: Date.now(),
        status: 'sent',
        poll
    };

    await addMessage(msg);
    setMessages(prev => [...prev, msg]);
    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleSendSticker = async (url: string) => {
    const recipient = isGroup ? chat.id : otherId!;
    const msg: Message = {
        id: 'sticker_' + Math.random().toString(36).substring(2, 11),
        senderId: currentUser.uid,
        recipientId: recipient,
        text: '👾 Sticker',
        type: 'sticker',
        timestamp: Date.now(),
        status: 'sent',
        stickerUrl: url
    };
    await addMessage(msg);
    setMessages(prev => [...prev, msg]);
    setShowStickerPicker(false);
  };

  const handleForward = async (targetChat: Chat) => {
    if (!forwardingMessage) return;
    const targetParticipants = targetChat.participants || [];
    const targetId = targetChat.type === 'group' ? targetChat.id : targetParticipants.find(p => p !== currentUser.uid)!;
    const { replyContext, ...msgContent } = forwardingMessage;
    const forwardMsg: Message = {
      ...msgContent,
      id: 'fwd_' + Math.random().toString(36).substring(2, 11),
      senderId: currentUser.uid,
      recipientId: targetId,
      timestamp: Date.now(),
      status: 'sent',
      isForwarded: true
    };
    await addMessage(forwardMsg);
    setForwardingMessage(null);
    alert(`Forwarded to ${targetChat.name || 'Contact'}`);
  };

  const openForwardModal = async (msg: Message) => {
    setForwardingMessage(msg);
    const chats = await getMyChats(currentUser.uid);
    const users = await getAllUsers();
    setAvailableChats(chats);
    setAllUsers(users);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const recipient = isGroup ? chat.id : otherId;
    if (!recipient) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileUrl = event.target?.result as string;
      let messageType: any = 'file';
      if (file.type.startsWith(PREFIX_IMAGE)) messageType = 'image';
      else if (file.type.startsWith(PREFIX_VIDEO)) messageType = 'video';
      const msg: Message = {
        id: 'f_' + Math.random().toString(36).substring(2, 11), 
        senderId: currentUser.uid,
        recipientId: recipient, 
        text: file.name, 
        type: messageType,
        timestamp: Date.now(), 
        status: 'sent', 
        fileUrl, 
        fileName: file.name
      };
      setMessages(prev => [...prev, msg]);
      await addMessage(msg);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setShowAttachMenu(false);
  };

  const handleHeaderClick = () => {
    if (isGroup) {
      setShowGroupInfo(true);
    } else {
      onUserClick(otherUser || {} as User);
    }
  };

  const renderDateSeparator = (timestamp: number, prevTimestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;

    const dateStr = date.toDateString();
    const prevDateStr = prevTimestamp ? new Date(prevTimestamp).toDateString() : null;
    
    if (dateStr !== prevDateStr) {
      return (
        <div className="flex justify-center my-6 sticky top-20 z-[2]">
          <div className="px-3 py-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 dark:border-white/5">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const isOnline = otherUser?.status === 'online' && (Date.now() - (otherUser.lastSeen || 0) < 3 * 60 * 1000);
  const canSeeStatus = isGroup || (!isBlockedByThem && otherUser?.privacySettings?.lastSeen !== 'nobody');
  
  const statusColor = !isGroup && isOnline && canSeeStatus ? 'text-green-500' : 'text-slate-500 dark:text-slate-400';
  const statusText = !isGroup && canSeeStatus ? (isOnline ? 'Online Now' : 'Offline') : '';

  const displayPhoto = (!isGroup && isBlockedByThem) 
    ? 'https://ui-avatars.com/api/?name=User&background=random' 
    : (isGroup ? (chat.groupIcon || `https://picsum.photos/seed/${chat.id}/200`) : otherUser?.photoURL);

  const latestPinnedId = pinnedMessageIds[pinnedMessageIds.length - 1];
  const pinnedMessage = messages.find(m => m.id === latestPinnedId);

  return (
    <div className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-900 animate-in fade-in duration-300 relative overflow-hidden ${FONT_SIZE_CLASSES[fontSize]}`}>
      {/* Background with Pattern */}
      <div className={`absolute inset-0 z-0 transition-all duration-700 ${wallpaper !== 'custom' ? WALLPAPER_CLASSES[wallpaper] || '' : ''}`}>
        {wallpaper === 'custom' && customUrl && <img src={customUrl} className="absolute inset-0 w-full h-full object-cover" alt="" /> }
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url('${BG_PATTERN}')` }}></div>
      </div>

      {/* Professional Glassmorphism Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20 border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm sticky top-0 transition-all">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="lg:hidden p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleHeaderClick}>
            <div className="relative">
               <img src={displayPhoto} className="w-10 h-10 rounded-full object-cover shadow-md ring-2 ring-transparent group-hover:ring-indigo-500 transition-all" alt="" />
               {!isGroup && isOnline && canSeeStatus && (
                 <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></span>
               )}
            </div>
            
            <div className="flex flex-col justify-center min-w-0">
              <h3 className="font-bold text-sm leading-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                {isGroup ? chat.name : (otherUser?.name || 'Loading...')}
                {isLocked && <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6-5c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3z"/></svg>}
              </h3>
              
              {typingUsers.length > 0 ? (
                 <div className="flex items-center gap-1 text-indigo-500 text-[10px] font-bold uppercase tracking-wide">
                    <span className="flex gap-0.5 mt-0.5">
                      <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                      <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    </span>
                    {isGroup ? 'Someone is typing...' : 'Typing...'}
                 </div>
              ) : (
                 <p className={`text-[11px] font-medium truncate ${statusColor}`}>
                    {isGroup ? `${chat.participants?.length || 0} members` : statusText}
                 </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isGroup && otherUser && !isBlockedByThem && !isBlockedByMe && (
            <>
              <button onClick={() => onCallStart?.(otherUser, 'voice')} className="p-2.5 text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </button>
              <button onClick={() => onCallStart?.(otherUser, 'video')} className="p-2.5 text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </>
          )}
          <button onClick={async () => { await toggleChatLock(chat.id, currentUser.uid); setIsLocked(!isLocked); }} className={`p-2.5 rounded-xl transition-all ${isLocked ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </button>
        </div>
      </div>

      {/* Pinned Message Widget */}
      {pinnedMessage && (
        <div 
            onClick={() => {
                const el = document.getElementById(`msg-${pinnedMessage.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.classList.add('bg-indigo-100', 'dark:bg-indigo-900');
                setTimeout(() => el?.classList.remove('bg-indigo-100', 'dark:bg-indigo-900'), 1000);
            }}
            className="absolute top-[4.5rem] left-4 right-4 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-indigo-500/20 flex items-center justify-between cursor-pointer animate-in slide-in-from-top-4 duration-300"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
                <div className="min-w-0">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Pinned</p>
                    <p className="text-xs text-slate-700 dark:text-slate-200 truncate font-medium">{pinnedMessage.text || 'Media Attachment'}</p>
                </div>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); togglePinMessage(chat.id, pinnedMessage.id); }}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth z-[1] no-scrollbar">
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id || index}>
            {renderDateSeparator(msg.timestamp, messages[index-1]?.timestamp)}
            <MessageBubble 
              message={msg} 
              isOwn={msg.senderId === currentUser.uid} 
              isAI={msg.senderId === AI_BOT_ID} 
              onReply={setReplyingTo} 
              onForward={openForwardModal}
              onDelete={triggerDeleteFlow}
              onEdit={handleEditMessage}
              onPin={handlePinMessage}
              isPinned={pinnedMessageIds.includes(msg.id)}
              onMediaClick={handleMediaClick}
            />
          </React.Fragment>
        ))}
        {/* Typing Bubble */}
        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2 animate-in fade-in slide-in-from-left-2 duration-300 ml-2">
             {!isGroup && <img src={displayPhoto} className="w-6 h-6 rounded-full border border-white dark:border-slate-800 shadow-sm" alt="" />}
             <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-md border border-slate-100 dark:border-slate-700 flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
             </div>
          </div>
        )}
      </div>

      {/* Floating Input Area */}
      <div className="p-4 z-20 sticky bottom-0 bg-gradient-to-t from-white/90 via-white/50 to-transparent dark:from-slate-900/90 dark:via-slate-900/50 pb-6">
        {/* Context Panels (Reply/Edit) */}
        <div className="max-w-4xl mx-auto flex flex-col gap-2 mb-2">
            {editingMessage && (
                <div className="mx-2 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex justify-between items-center animate-in slide-in-from-bottom-2">
                    <div>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Editing</span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">{editingMessage.text}</p>
                    </div>
                    <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="p-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-full text-indigo-700 dark:text-indigo-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            {replyingTo && (
                <div className="mx-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border-l-4 border-indigo-500 flex justify-between items-center shadow-sm animate-in slide-in-from-bottom-2">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Replying to {replyingTo.senderId === currentUser.uid ? 'You' : 'Friend'}</p>
                        <p className="text-xs text-slate-500 truncate italic">{replyingTo.text || 'Media Attachment'}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
        </div>

        {/* Input Bar */}
        {(!isGroup && (isBlockedByMe || isBlockedByThem)) ? (
            <div className="mx-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-center border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-500">
                    {isBlockedByMe ? "You have blocked this contact." : "You cannot message this contact."}
                </p>
            </div>
        ) : (
            <div className="flex items-end gap-2 max-w-4xl mx-auto relative" ref={attachMenuRef}>
                {isRecording ? (
                    <div className="flex-1 bg-red-500 text-white rounded-[2rem] p-3 flex items-center justify-between shadow-xl animate-pulse">
                        <div className="flex items-center gap-3 px-4">
                            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                            <span className="font-mono font-bold tracking-widest">{formatDuration(recordingDuration)}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => stopRecording(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors">Cancel</button>
                            <button onClick={() => stopRecording(true)} className="p-2 bg-white text-red-500 rounded-full shadow-md hover:scale-110 transition-transform">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <button 
                            onClick={() => setShowAttachMenu(!showAttachMenu)} 
                            className="p-3.5 mb-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-full transition-all active:scale-95 shadow-sm"
                        >
                            <svg className={`w-6 h-6 transition-transform duration-300 ${showAttachMenu ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                        </button>

                        {showAttachMenu && (
                            <div className="absolute bottom-full left-0 mb-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 min-w-[180px] animate-in slide-in-from-bottom-2 fade-in z-50">
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                                    <span className="p-1.5 bg-green-100 text-green-600 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></span>
                                    Gallery
                                </button>
                                <button onClick={() => { setShowPollModal(true); setShowAttachMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                                    <span className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></span>
                                    Poll
                                </button>
                                <button onClick={() => { setShowStickerPicker(true); setShowAttachMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">
                                    <span className="p-1.5 bg-pink-100 text-pink-600 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                                    Stickers
                                </button>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={ACCEPTED_MEDIA} className="hidden" />

                        <form onSubmit={handleSend} className="flex-1 bg-white dark:bg-slate-800 rounded-[1.8rem] shadow-lg shadow-indigo-500/5 border border-slate-100 dark:border-slate-700 flex items-center p-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50">
                            <input 
                                ref={inputRef}
                                type="text" 
                                value={inputText} 
                                onChange={handleInputChange} 
                                placeholder="Message..." 
                                className="flex-1 bg-transparent px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none" 
                            />
                            {inputText.trim() ? (
                                <button type="submit" className="p-3 bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 active:scale-90 transition-all">
                                    {editingMessage ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5 rotate-90 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    )}
                                </button>
                            ) : (
                                <button type="button" onClick={startRecording} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-red-500 hover:text-white rounded-full transition-all active:scale-90 group">
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </button>
                            )}
                        </form>
                    </>
                )}
            </div>
        )}
      </div>

      {showGroupInfo && (
        <GroupInfoModal 
          chat={chat}
          currentUser={currentUser}
          onClose={() => setShowGroupInfo(false)}
        />
      )}

      {viewingMedia && (
        <MediaViewer 
           message={viewingMedia}
           currentUser={currentUser}
           onClose={() => setViewingMedia(null)}
           onForward={openForwardModal}
           onReply={(msg) => setReplyingTo(msg)}
        />
      )}

      {showPollModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
                <h3 className="text-2xl font-black mb-6 dark:text-white tracking-tight">Create Poll</h3>
                <input 
                    type="text" 
                    placeholder="Ask a question..." 
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 font-bold mb-4 outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white transition-all"
                />
                <div className="space-y-3 mb-8 max-h-60 overflow-y-auto no-scrollbar">
                    {pollOptions.map((opt, i) => (
                        <input 
                            key={i}
                            type="text"
                            placeholder={`Option ${i + 1}`}
                            value={opt}
                            onChange={(e) => {
                                const newOpts = [...pollOptions];
                                newOpts[i] = e.target.value;
                                setPollOptions(newOpts);
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl px-5 py-3 text-sm outline-none border border-transparent focus:border-indigo-500 dark:text-white transition-all"
                        />
                    ))}
                    <button 
                        onClick={() => setPollOptions([...pollOptions, ''])}
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-widest px-2"
                    >
                        + Add Option
                    </button>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowPollModal(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                    <button onClick={handleCreatePoll} className="flex-1 py-4 bg-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 hover:bg-indigo-600 transition-all active:scale-95">Create</button>
                </div>
            </div>
        </div>
      )}

      {showStickerPicker && (
        <div className="fixed inset-0 z-[250] flex flex-col justify-end">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowStickerPicker(false)}></div>
            <div className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom h-[60%] flex flex-col relative z-10 border-t border-slate-200 dark:border-slate-800">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8"></div>
                <h3 className="text-xl font-black mb-6 dark:text-white px-2">Stickers</h3>
                <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-4 p-2 no-scrollbar">
                    {STICKERS.map((url, i) => (
                        <button key={i} onClick={() => handleSendSticker(url)} className="aspect-square hover:scale-110 transition-transform p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center">
                            <img src={url} alt="Sticker" className="w-full h-full object-contain drop-shadow-md" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {showDeleteOptions && messageToDelete && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowDeleteOptions(false)}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8"></div>
                <h3 className="text-xl font-black mb-6 text-center dark:text-white">Delete Message?</h3>
                
                <div className="flex flex-col gap-3">
                    {messageToDelete.senderId === currentUser.uid && (
                        <button 
                            onClick={() => confirmDelete('everyone')}
                            className="w-full p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-500 font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-between group"
                        >
                            <span>Delete for everyone</span>
                            <svg className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    )}
                    <button 
                        onClick={() => confirmDelete('me')}
                        className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                    >
                        <span>Delete for me</span>
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </button>
                    <button 
                        onClick={() => setShowDeleteOptions(false)}
                        className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mt-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}

      {forwardingMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setForwardingMessage(null)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[70vh] animate-in zoom-in-95">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold dark:text-white">Forward Message</h3>
                <button onClick={() => setForwardingMessage(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <svg className="w-6 h-6 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {availableChats.map(c => {
                   const isGrp = c.type === 'group';
                   const targetParticipants = c.participants || [];
                   const target = isGrp ? null : allUsers.find(u => u.uid === targetParticipants.find(p => p !== currentUser.uid));
                   return (
                     <button key={c.id} onClick={() => handleForward(c)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors text-left group">
                        <img src={isGrp ? c.groupIcon : target?.photoURL || `https://picsum.photos/seed/${c.id}/100`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                        <span className="font-bold text-sm flex-1 truncate dark:text-white">{isGrp ? c.name : target?.name || 'Contact'}</span>
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </div>
                     </button>
                   );
                })}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};