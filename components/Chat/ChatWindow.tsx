
import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { getAIResponse } from '../../gemini';
import { getUserById, addMessage, getMessages, toggleChatLock, markMessagesAsSeen, markMessagesAsDelivered, getMyChats, getAllUsers } from '../../firebase';

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
  const [isUploading, setIsUploading] = useState(false);
  const [wallpaper, setWallpaper] = useState('default');
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState('medium');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [availableChats, setAvailableChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGroup = chat.type === 'group';
  const otherId = !isGroup ? chat.participants.find(p => p !== currentUser.uid) || '' : chat.id;

  const loadSettings = () => {
    const saved = localStorage.getItem('roxx_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setWallpaper(parsed.wallpaper || 'default');
      setCustomUrl(parsed.customWallpaperUrl || null);
      setFontSize(parsed.fontSize || 'medium');
    }
  };

  useEffect(() => {
    loadSettings();
    window.addEventListener('roxx_settings_updated', loadSettings);
    return () => window.removeEventListener('roxx_settings_updated', loadSettings);
  }, []);

  useEffect(() => {
    const sync = async () => {
      if (!isGroup && !otherUser) {
        const u = await getUserById(otherId);
        if (u) setOtherUser(u);
      }
      await markMessagesAsDelivered(chat.id, currentUser.uid);
      await markMessagesAsSeen(chat.id, currentUser.uid);
      const msgs = await getMessages(chat.id);
      setMessages(prev => (JSON.stringify(prev) !== JSON.stringify(msgs) ? msgs : prev));
    };
    sync();
    const itv = setInterval(sync, 2000);
    return () => clearInterval(itv);
  }, [chat.id, otherId, isGroup, currentUser.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping, isUploading, replyingTo]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

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
      recipientId: isGroup ? chat.id : otherId,
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
      setIsTyping(true);
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
      } catch (err) { console.error("AI Error:", err); }
      finally { setIsTyping(false); }
    }
  };

  const handleForward = async (targetChat: Chat) => {
    if (!forwardingMessage) return;
    
    const targetId = targetChat.type === 'group' 
      ? targetChat.id 
      : targetChat.participants.find(p => p !== currentUser.uid)!;

    const forwardMsg: Message = {
      ...forwardingMessage,
      id: 'fwd_' + Math.random().toString(36).substr(2, 9),
      senderId: currentUser.uid,
      recipientId: targetId,
      timestamp: Date.now(),
      status: 'sent',
      isForwarded: true,
      replyContext: undefined // Remove context on forward
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
        recipientId: isGroup ? chat.id : otherId, 
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

  const renderDateSeparator = (timestamp: number, prevTimestamp?: number) => {
    const date = new Date(timestamp).toDateString();
    const prevDate = prevTimestamp ? new Date(prevTimestamp).toDateString() : null;
    if (date !== prevDate) {
      return (
        <div className="flex justify-center my-6 sticky top-2 z-10">
          <div className="px-4 py-1.5 bg-slate-900/10 dark:bg-white/10 backdrop-blur-xl border border-white/20 rounded-full">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
              {new Date(timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-900 animate-in fade-in duration-300 relative overflow-hidden ${FONT_SIZE_CLASSES[fontSize]}`}>
      {/* Wallpapers */}
      <div className={`absolute inset-0 z-0 transition-all duration-700 ${wallpaper !== 'custom' ? WALLPAPER_CLASSES[wallpaper] : ''}`}>
        {wallpaper === 'custom' && customUrl && (
          <img src={customUrl} className="absolute inset-0 w-full h-full object-cover" alt="" />
        )}
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/asfalt-dark.png')` }}></div>
      </div>

      <div className="p-3 md:p-4 flex items-center justify-between glass z-10 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="lg:hidden p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg></button>
          <div className="relative cursor-pointer group" onClick={() => onUserClick(isGroup ? ({} as User) : otherUser!)}>
            <img src={isGroup ? (chat.groupIcon || `https://picsum.photos/seed/${chat.id}/200`) : otherUser?.photoURL} className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform" alt="" />
            {!isGroup && otherUser?.status === 'online' && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>}
          </div>
          <div className="min-w-0 cursor-pointer" onClick={() => onUserClick(isGroup ? ({} as User) : otherUser!)}>
            <h3 className="font-bold text-sm leading-none flex items-center gap-1.5 truncate">
              {isGroup ? chat.name : otherUser?.name}
              {isLocked && <svg className="w-3.5 h-3.5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6-5c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3z"/></svg>}
            </h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{isGroup ? `${chat.participants.length} members` : (otherUser?.status === 'online' ? 'Online Now' : 'Active status hidden')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isGroup && otherUser && (
            <button onClick={() => onCallStart?.(otherUser, 'video')} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
          )}
          <button onClick={async () => { await toggleChatLock(chat.id, currentUser.uid); setIsLocked(!isLocked); }} className={`p-2.5 rounded-xl transition-all ${isLocked ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth z-[5] no-scrollbar">
        <div className="flex justify-center mb-8 mt-2">
           <div className="px-5 py-2 bg-yellow-500/10 dark:bg-yellow-500/5 border border-yellow-500/10 rounded-[1.5rem] flex items-center gap-2.5 backdrop-blur-md">
              <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
              <span className="text-[10px] font-black uppercase text-yellow-700 dark:text-yellow-400 tracking-[0.2em]">End-to-end Encrypted</span>
           </div>
        </div>

        {messages.map((msg, index) => (
          <React.Fragment key={msg.id || index}>
            {renderDateSeparator(msg.timestamp, messages[index-1]?.timestamp)}
            <MessageBubble message={msg} isOwn={msg.senderId === currentUser.uid} isAI={msg.senderId === 'gemini_ai'} onReply={setReplyingTo} onForward={openForwardModal} />
          </React.Fragment>
        ))}
        {isTyping && <div className="flex items-center gap-1.5 ml-4 pb-4 animate-in slide-in-from-left-2"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div></div>}
      </div>

      {/* Input Area with Reply Preview */}
      <div className="glass border-t border-slate-200 dark:border-slate-800 z-10 flex flex-col">
        {replyingTo && (
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-l-4 border-indigo-500 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
             <div className="min-w-0">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Replying to {replyingTo.senderId === currentUser.uid ? 'Yourself' : 'Contact'}</p>
                <p className="text-xs text-slate-500 truncate">{replyingTo.text || 'Media Message'}</p>
             </div>
             <button onClick={() => setReplyingTo(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        )}
        
        <form onSubmit={handleSend} className="p-3 md:p-4 flex gap-2.5 items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl shrink-0 transition-colors active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg></button>
          <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white/60 dark:bg-slate-800/80 rounded-[1.5rem] px-6 py-4 text-sm font-medium outline-none border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner" />
          <button type="submit" disabled={!inputText.trim()} className="p-4 bg-indigo-500 text-white rounded-2xl disabled:opacity-40 active:scale-90 shadow-xl shadow-indigo-500/20 transition-all shrink-0"><svg className="w-6 h-6 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
        </form>
      </div>

      {/* Forward Modal */}
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
                <p className="text-[10px] font-black uppercase text-slate-400 px-2">Select a chat</p>
                {availableChats.map(c => {
                   const isGrp = c.type === 'group';
                   const target = isGrp ? null : allUsers.find(u => u.uid === c.participants.find(p => p !== currentUser.uid));
                   const name = isGrp ? c.name : target?.name || 'Contact';
                   const photo = isGrp ? c.groupIcon : target?.photoURL;
                   return (
                     <button 
                      key={c.id} 
                      onClick={() => handleForward(c)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors text-left"
                     >
                        <img src={photo || `https://picsum.photos/seed/${c.id}/100`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                        <span className="font-bold text-sm flex-1 truncate">{name}</span>
                        <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
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
