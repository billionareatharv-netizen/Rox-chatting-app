import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { GroupInfoModal } from './GroupInfoModal';
import { getAIResponse } from '../../gemini';
import { getUserById, addMessage, getMessages, toggleChatLock, markMessagesAsSeen, markMessagesAsDelivered, getMyChats, getAllUsers, setTypingStatus, subscribeToChat, deleteMessage, deleteMessageForEveryone, deleteMessageForMe, editMessage, subscribeToUser, togglePinMessage } from '../../firebase';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  onClose: () => void;
  onUserClick: (user: User) => void;
  onCallStart?: (user: User, type: 'voice' | 'video') => void;
}

const WALLPAPER_CLASSES: Record<string, string> = {
  default: 'bg-slate-100 dark:bg-slate-950',
  indigo: 'bg-indigo-600',
  emerald: 'bg-emerald-700',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  dark: 'bg-black',
  gradient: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-black',
};

const FONT_SIZE_CLASSES: Record<string, string> = {
  small: 'text-[12px]',
  medium: 'text-[14px]',
  large: 'text-[16px]',
};

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
  
  // UI State for Deletion
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

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

  const isGroup = chat.type === 'group';
  // Safe access to participants
  const otherId = !isGroup && chat.participants 
    ? (chat.participants.find(p => p !== currentUser.uid) || (chat.participants.includes(currentUser.uid) ? currentUser.uid : '')) 
    : chat.id;

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

  // Subscribe to Chat (Typing indicators, Pinned Messages)
  useEffect(() => {
    const unsubscribe = subscribeToChat(chat.id, (data) => {
      // Typing
      if (data.typing) {
        const activeTypers = Object.entries(data.typing)
          .filter(([uid, isTyping]) => uid !== currentUser.uid && isTyping)
          .map(([uid]) => uid);
        setTypingUsers(activeTypers);
      } else {
        setTypingUsers([]);
      }
      // Pinned Messages
      if (data.pinnedMessages) {
        setPinnedMessageIds(data.pinnedMessages);
      } else {
        setPinnedMessageIds([]);
      }
    });
    return () => unsubscribe();
  }, [chat.id, currentUser.uid]);

  // Subscribe to Other User (Online Status)
  useEffect(() => {
    if (isGroup || !otherId) return;
    
    getUserById(otherId).then(u => { if(u) setOtherUser(u); });

    const unsubscribe = subscribeToUser(otherId, (userData) => {
        setOtherUser(userData);
    });
    return () => unsubscribe();
  }, [otherId, isGroup]);

  // Messages Polling
  useEffect(() => {
    const sync = async () => {
      const msgs = await getMessages(chat.id);
      setMessages(prev => {
        // Simple comparison to prevent excessive re-renders if nothing changed
        // In prod, use deep compare or robust ID/timestamp checks
        if (msgs.length !== prev.length) return msgs;
        // Check for edits/deletes
        const changed = msgs.some((m, i) => {
            const p = prev[i];
            return p.id !== m.id || p.status !== m.status || p.text !== m.text || p.type !== m.type;
        });
        return changed ? msgs : prev;
      });
    };
    sync();
    const itv = setInterval(sync, 2000);
    return () => clearInterval(itv);
  }, [chat.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping, isUploading, replyingTo, typingUsers, isRecording, editingMessage, pinnedMessageIds]);

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

  // --- Voice Recording Logic (Fixed) ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      // Prioritize supported types
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
      }

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
    } catch (err) {
      alert("Microphone access denied. Please enable permissions.");
    }
  };

  const stopRecording = async (shouldSend: boolean) => {
    if (mediaRecorder && isRecording) {
      // Capture mimeType before stopping
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      
      mediaRecorder.onstop = async () => {
        if (shouldSend && audioChunksRef.current.length > 0) {
            // Explicitly use the recorded mimetype
            const blob = new Blob(audioChunksRef.current, { type: mimeType });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64Audio = reader.result as string;
                const msg: Message = {
                    id: 'v_' + Math.random().toString(36).substr(2, 9),
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

  // --- Deletion UX Logic ---
  const triggerDeleteFlow = (msg: Message) => {
      setMessageToDelete(msg);
      setShowDeleteOptions(true);
  };

  const confirmDelete = async (type: 'me' | 'everyone') => {
      if (!messageToDelete) return;
      
      const confirmText = type === 'everyone' 
        ? "Are you sure you want to delete this message for EVERYONE?" 
        : "Delete this message from your chat history?";
      
      if (window.confirm(confirmText)) {
          if (type === 'everyone') {
              // Optimistic
              setMessages(prev => prev.map(m => m.id === messageToDelete.id ? { ...m, type: 'deleted', text: '🚫 This message was deleted' } : m));
              await deleteMessageForEveryone(messageToDelete.id);
          } else {
              // Optimistic: remove from local view
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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    setTypingStatus(chat.id, currentUser.uid, false);

    // Handle Edit
    if (editingMessage) {
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, text: text, isEdited: true } : m));
        await editMessage(editingMessage.id, text);
        setEditingMessage(null);
        setInputText('');
        return;
    }
    
    const recipient = isGroup ? chat.id : otherId;
    if (!recipient) return;

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
      id: 'm_' + Math.random().toString(36).substr(2, 9),
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

    if (text.toLowerCase().startsWith('/ai')) {
      setTypingUsers(prev => [...prev, 'gemini_ai']);
      try {
        const res = await getAIResponse(text.replace('/ai', '').trim());
        const aiMsg: Message = {
          id: 'ai_' + Date.now(), 
          senderId: 'gemini_ai', 
          recipientId: isGroup ? chat.id : currentUser.uid,
          text: res || "I'm thinking...", 
          type: 'text', 
          timestamp: Date.now(), 
          status: 'seen'
        };
        await addMessage(aiMsg);
      } catch (err) { }
      finally { setTypingUsers(prev => prev.filter(id => id !== 'gemini_ai')); }
    }
  };

  const handleForward = async (targetChat: Chat) => {
    if (!forwardingMessage) return;
    const targetId = targetChat.type === 'group' ? targetChat.id : targetChat.participants.find(p => p !== currentUser.uid)!;
    const { replyContext, ...msgContent } = forwardingMessage;
    const forwardMsg: Message = {
      ...msgContent,
      id: 'fwd_' + Math.random().toString(36).substr(2, 9),
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
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      const msg: Message = {
        id: 'f_' + Math.random().toString(36).substr(2, 9), 
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
        <div className="flex justify-center my-6 sticky top-2 z-10">
          <div className="px-4 py-1.5 bg-slate-900/10 dark:bg-white/10 backdrop-blur-xl border border-white/20 rounded-full">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
              {date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const isOnline = otherUser?.status === 'online' && (Date.now() - (otherUser.lastSeen || 0) < 3 * 60 * 1000);
  const statusColor = !isGroup && isOnline ? 'text-green-500' : 'text-slate-500 dark:text-slate-400';
  const statusText = !isGroup && isOnline ? 'Online Now' : 'Offline';

  // Get Latest Pinned Message content
  const latestPinnedId = pinnedMessageIds[pinnedMessageIds.length - 1];
  const pinnedMessage = messages.find(m => m.id === latestPinnedId);

  return (
    <div className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-900 animate-in fade-in duration-300 relative overflow-hidden ${FONT_SIZE_CLASSES[fontSize]}`}>
      <div className={`absolute inset-0 z-0 transition-all duration-700 ${wallpaper !== 'custom' ? WALLPAPER_CLASSES[wallpaper] || '' : ''}`}>
        {wallpaper === 'custom' && customUrl && <img src={customUrl} className="absolute inset-0 w-full h-full object-cover" alt="" /> }
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/asfalt-dark.png')` }}></div>
      </div>

      {/* Header */}
      <div className="p-3 md:p-4 flex items-center justify-between glass z-10 border-b border-slate-200 dark:border-slate-800 shadow-sm relative">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="lg:hidden p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg></button>
          <div className="relative cursor-pointer group" onClick={handleHeaderClick}>
            <img src={isGroup ? (chat.groupIcon || `https://picsum.photos/seed/${chat.id}/200`) : otherUser?.photoURL} className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform" alt="" />
            {!isGroup && isOnline && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>}
          </div>
          <div className="min-w-0 cursor-pointer" onClick={handleHeaderClick}>
            <h3 className="font-bold text-sm leading-none flex items-center gap-1.5 truncate">
              {isGroup ? chat.name : (otherUser?.name || 'Loading...')}
              {isLocked && <svg className="w-3.5 h-3.5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6-5c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3z"/></svg>}
            </h3>
            {typingUsers.length > 0 ? (
               <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5 animate-pulse flex items-center gap-1">
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                    <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  </div>
                  {isGroup ? `${typingUsers.length} typing...` : typingUsers.includes('gemini_ai') ? 'AI thinking...' : 'Typing...'}
               </span>
            ) : (
               <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${statusColor}`}>
                  {isGroup ? `${chat.participants?.length || 0} members` : statusText}
               </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isGroup && otherUser && (
            <>
              <button onClick={() => onCallStart?.(otherUser, 'voice')} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></button>
              <button onClick={() => onCallStart?.(otherUser, 'video')} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
            </>
          )}
          <button onClick={async () => { await toggleChatLock(chat.id, currentUser.uid); setIsLocked(!isLocked); }} className={`p-2.5 rounded-xl transition-all ${isLocked ? 'bg-indigo-500 text-white shadow-lg' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></button>
        </div>
      </div>

      {/* Pinned Message Header */}
      {pinnedMessage && (
        <div 
            onClick={() => {
                const el = document.getElementById(`msg-${pinnedMessage.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.classList.add('bg-indigo-100', 'dark:bg-indigo-900');
                setTimeout(() => el?.classList.remove('bg-indigo-100', 'dark:bg-indigo-900'), 1000);
            }}
            className="absolute top-[4.5rem] left-4 right-4 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl p-3 border-l-4 border-indigo-500 shadow-lg flex items-center justify-between cursor-pointer animate-in slide-in-from-top-2"
        >
            <div className="min-w-0">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Pinned Message</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium">{pinnedMessage.text || 'Media File'}</p>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); togglePinMessage(chat.id, pinnedMessage.id); }}
                className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth z-[5] no-scrollbar">
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id || index}>
            {renderDateSeparator(msg.timestamp, messages[index-1]?.timestamp)}
            <MessageBubble 
              message={msg} 
              isOwn={msg.senderId === currentUser.uid} 
              isAI={msg.senderId === 'gemini_ai'} 
              onReply={setReplyingTo} 
              onForward={openForwardModal}
              onDelete={triggerDeleteFlow}
              onEdit={handleEditMessage}
              onPin={handlePinMessage}
              isPinned={pinnedMessageIds.includes(msg.id)}
            />
          </React.Fragment>
        ))}
        {/* Visible Typing Bubble */}
        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2 px-2 py-2 animate-in slide-in-from-left-4 fade-in duration-300">
             {!isGroup && <img src={otherUser?.photoURL || `https://picsum.photos/seed/${chat.id}/50`} className="w-8 h-8 rounded-full border border-white dark:border-slate-800" alt="" />}
             <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
             </div>
          </div>
        )}
      </div>

      <div className="glass border-t border-slate-200 dark:border-slate-800 z-10 flex flex-col">
        {editingMessage && (
             <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 flex items-center justify-between">
                <div>
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Editing Message</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{editingMessage.text}</p>
                </div>
                <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="p-1 text-indigo-500 hover:bg-indigo-100 rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
        )}
        {replyingTo && (
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-l-4 border-indigo-500 flex items-center justify-between">
             <div className="min-w-0">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Replying to {replyingTo.senderId === currentUser.uid ? 'Yourself' : 'Contact'}</p>
                <p className="text-xs text-slate-500 truncate">{replyingTo.text || 'Media Message'}</p>
             </div>
             <button onClick={() => setReplyingTo(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        )}
        
        <div className="p-3 md:p-4 flex gap-2.5 items-center">
          {isRecording ? (
             <div className="flex-1 flex items-center justify-between bg-red-500 text-white rounded-[1.5rem] px-6 py-4 animate-pulse">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                   <span className="font-bold text-sm tracking-widest">{formatDuration(recordingDuration)}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => stopRecording(false)} className="text-white/80 hover:text-white text-xs font-bold uppercase">Cancel</button>
                    <button onClick={() => stopRecording(true)} className="p-2 bg-white text-red-500 rounded-full shadow-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                    </button>
                </div>
             </div>
          ) : (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl shrink-0 transition-colors active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg></button>
              
              <form onSubmit={handleSend} className="flex-1 flex gap-2">
                 <input 
                    ref={inputRef}
                    type="text" 
                    value={inputText} 
                    onChange={handleInputChange} 
                    placeholder="Type a message..." 
                    className="flex-1 bg-white/60 dark:bg-slate-800/80 rounded-[1.5rem] px-6 py-4 text-sm font-medium outline-none border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner" 
                />
                {inputText.trim() ? (
                    <button type="submit" className="p-4 bg-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-500/20 transition-all shrink-0 active:scale-95">
                        {editingMessage ? (
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                             <svg className="w-6 h-6 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        )}
                    </button>
                ) : (
                    <button type="button" onClick={startRecording} className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shrink-0 active:scale-95 group">
                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>

      {/* Group Info Modal */}
      {showGroupInfo && (
        <GroupInfoModal 
          chat={chat}
          currentUser={currentUser}
          onClose={() => setShowGroupInfo(false)}
        />
      )}

      {/* Delete Options Bottom Sheet / Modal */}
      {showDeleteOptions && messageToDelete && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteOptions(false)}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                <h3 className="text-lg font-bold mb-4 text-center">Delete Message?</h3>
                
                <div className="flex flex-col gap-3">
                    {messageToDelete.senderId === currentUser.uid && (
                        <button 
                            onClick={() => confirmDelete('everyone')}
                            className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center justify-between group"
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
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setForwardingMessage(null)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[70vh] animate-in zoom-in-95">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold">Forward Message</h3>
                <button onClick={() => setForwardingMessage(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {availableChats.map(c => {
                   const isGrp = c.type === 'group';
                   const target = isGrp ? null : allUsers.find(u => u.uid === c.participants.find(p => p !== currentUser.uid));
                   return (
                     <button key={c.id} onClick={() => handleForward(c)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors text-left">
                        <img src={isGrp ? c.groupIcon : target?.photoURL || `https://picsum.photos/seed/${c.id}/100`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                        <span className="font-bold text-sm flex-1 truncate">{isGrp ? c.name : target?.name || 'Contact'}</span>
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