
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Chat, Message, PollData } from '../../types';
import { MessageBubble } from './MessageBubble';
import { GroupInfoModal } from './GroupInfoModal';
import { MediaViewer } from './MediaViewer';
import { getAIResponse } from '../../gemini';
import { 
  getUserById, 
  addMessage, 
  getMessages, 
  deleteMessageForEveryone, 
  deleteMessageForMe, 
  togglePinMessage, 
  setTypingStatus
} from '../../firebase';
import { ROLE_STYLES } from '../../premiumUtils';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  onClose: () => void;
  onUserClick: (user: User) => void;
  onCallStart?: (user: User, type: 'voice' | 'video') => void;
  nicknames: Record<string, string>; 
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
  default: 'bg-slate-50 dark:bg-slate-950',
  indigo: 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/40 dark:to-purple-900/40',
  dark: 'bg-slate-950',
};

const FONT_SIZE_CLASSES: Record<string, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
};

const AI_CMD = "/ai";
const AI_BOT_ID = "gemini_ai";
const BG_PATTERN = "https://www.transparenttextures.com/patterns/cubes.png";

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, currentUser, onClose, onUserClick, onCallStart, nicknames }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<Message | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const isGroup = chat.type === 'group';
  const participants = chat.participants || [];
  const otherId = !isGroup && participants.length > 0
    ? (participants.find(p => p !== currentUser.uid) || (participants.includes(currentUser.uid) ? currentUser.uid : '')) 
    : chat.id;

  const displayName = isGroup ? chat.name : (otherUser ? (nicknames[otherUser.uid] || otherUser.name) : 'Loading...');
  
  // Wallpaper Logic
  // Using wallpapers?.default helps fallback
  const wallpaperPref = currentUser.wallpapers?.[chat.id] || currentUser.wallpapers?.default || 'default';
  const isCustomWallpaper = wallpaperPref.startsWith('http') || wallpaperPref.startsWith('data:');
  const wallpaperClass = !isCustomWallpaper ? WALLPAPER_CLASSES[wallpaperPref] || WALLPAPER_CLASSES['default'] : '';

  // Throttle typing updates
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    else setTypingStatus(chat.id, currentUser.uid, true);

    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(chat.id, currentUser.uid, false);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages.length, replyingTo]);

  // Load Messages Logic
  useEffect(() => {
    const sync = async () => {
      const canSpy = currentUser.role !== 'user';
      const msgs = await getMessages(chat.id, canSpy);
      setMessages(prev => {
        if (prev.length === msgs.length && prev[prev.length - 1]?.id === msgs[msgs.length - 1]?.id) return prev;
        return msgs;
      });
    };
    sync();
    const itv = setInterval(sync, 1500); 
    return () => clearInterval(itv);
  }, [chat.id, currentUser.role]);

  // Fetch Other User
  useEffect(() => {
    if (isGroup || !otherId) return;
    getUserById(otherId).then(u => { 
        if(u) setOtherUser(u); 
    });
  }, [otherId, isGroup]);

  // Handlers
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingStatus(chat.id, currentUser.uid, false);

    const recipient = isGroup ? chat.id : otherId;
    if (!recipient) return;

    // Optimistic Update
    const tempId = 'temp_' + Date.now();
    const msg: Message = {
      id: tempId,
      senderId: currentUser.uid, 
      recipientId: recipient,
      text, 
      type: 'text', 
      timestamp: Date.now(), 
      status: 'sent',
      replyContext: replyingTo ? {
        messageId: replyingTo.id,
        text: replyingTo.text || 'Media',
        senderName: '...'
      } : undefined
    };

    setMessages(prev => [...prev, msg]);
    setInputText('');
    setReplyingTo(null);
    
    await addMessage({ ...msg, id: 'm_' + Math.random().toString(36).substring(2, 11) });

    if (text.toLowerCase().startsWith(AI_CMD)) {
        const prompt = text.replace(AI_CMD, '').trim();
        const response = await getAIResponse(prompt);
        await addMessage({
            id: 'ai_' + Date.now(),
            senderId: AI_BOT_ID,
            recipientId: recipient,
            text: response,
            type: 'text',
            timestamp: Date.now(),
            status: 'sent'
        });
    }
  };

  const triggerDeleteFlow = useCallback((msg: Message) => {
      setMessageToDelete(msg);
      setShowDeleteOptions(true);
  }, []);

  const handleMediaClick = useCallback((msg: Message) => {
      setViewingMedia(msg);
  }, []);

  const confirmDelete = async (type: 'me' | 'everyone') => {
      if (!messageToDelete) return;
      if (type === 'everyone') await deleteMessageForEveryone(messageToDelete.id);
      else await deleteMessageForMe(messageToDelete.id, currentUser.uid);
      setShowDeleteOptions(false);
      setMessageToDelete(null);
  };

  const handleCreatePoll = async () => {
      const recipient = isGroup ? chat.id : otherId!;
      const poll: PollData = {
          question: pollQuestion,
          options: pollOptions.filter(o => o.trim()).map((text, i) => ({ id: `opt_${i}`, text, votes: [] })),
          allowMultiple: false
      };
      await addMessage({
          id: 'poll_' + Date.now(),
          senderId: currentUser.uid,
          recipientId: recipient,
          text: 'Poll',
          type: 'poll',
          timestamp: Date.now(),
          status: 'sent',
          poll
      });
      setShowPollModal(false);
  };

  const handleSendSticker = async (url: string) => {
      const recipient = isGroup ? chat.id : otherId!;
      await addMessage({
          id: 'sticker_' + Date.now(),
          senderId: currentUser.uid,
          recipientId: recipient,
          text: 'Sticker',
          type: 'sticker',
          timestamp: Date.now(),
          status: 'sent',
          stickerUrl: url
      });
      setShowStickerPicker(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          const recipient = isGroup ? chat.id : otherId!;
          await addMessage({
              id: 'file_' + Date.now(),
              senderId: currentUser.uid,
              recipientId: recipient,
              text: file.name,
              type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file',
              timestamp: Date.now(),
              status: 'sent',
              fileUrl: event.target?.result as string,
              fileName: file.name
          });
      };
      reader.readAsDataURL(file);
      setShowAttachMenu(false);
  };

  // --- RENDER ADMIN/FOUNDER BADGE ---
  const renderRoleBadge = () => {
      if(isGroup || !otherUser) return null;
      if(otherUser.role !== 'user') {
          const style = ROLE_STYLES[otherUser.role];
          return (
              <span className={`ml-2 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${style.badge}`}>
                  {style.label} {style.icon}
              </span>
          );
      }
      return null;
  };

  return (
    <div className={`flex flex-col h-[100dvh] bg-white dark:bg-slate-900 animate-in fade-in duration-300 relative overflow-hidden ${FONT_SIZE_CLASSES[fontSize]}`}>
      
      {/* Background with Pattern - Key ensures re-render on pref change */}
      <div key={wallpaperPref} className={`absolute inset-0 z-0 ${wallpaperClass}`}>
        {isCustomWallpaper && <img src={wallpaperPref} className="absolute inset-0 w-full h-full object-cover" alt="" /> }
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url('${BG_PATTERN}')` }}></div>
      </div>

      {/* Modern Glass Header */}
      <div className="px-4 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20 border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm sticky top-0 h-16 lg:h-20 shrink-0 safe-area-top">
        <div className="flex items-center gap-2 overflow-hidden">
          <button onClick={onClose} className="lg:hidden p-2 -ml-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="flex items-center gap-3 cursor-pointer group min-w-0" onClick={() => isGroup ? setShowGroupInfo(true) : onUserClick(otherUser!)}>
            <div className="relative shrink-0">
               <div className={`w-10 h-10 rounded-full p-[2px] ${otherUser?.role === 'owner' ? ROLE_STYLES.owner.badge : ''}`}>
                   <img src={isGroup ? (chat.groupIcon || `https://picsum.photos/seed/${chat.id}/200`) : otherUser?.photoURL} className="w-full h-full rounded-full object-cover" alt="" />
               </div>
               {otherUser?.status === 'online' && !isGroup && (
                   <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
               )}
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h3 className="font-bold text-sm leading-tight text-slate-900 dark:text-white truncate flex items-center">
                {displayName}
                {renderRoleBadge()}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {typingUsers.length > 0 ? <span className="text-indigo-500 animate-pulse">Typing...</span> : (isGroup ? 'Tap for info' : (otherUser?.status === 'online' ? 'Online' : 'Offline'))}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isGroup && (
            <>
              <button onClick={() => onCallStart?.(otherUser!, 'voice')} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </button>
              <button onClick={() => onCallStart?.(otherUser!, 'video')} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth z-[1] no-scrollbar pb-32">
        {messages.map((msg, index) => (
            <MessageBubble 
            key={msg.id}
            message={msg} 
            isOwn={msg.senderId === currentUser.uid} 
            isAI={msg.senderId === AI_BOT_ID} 
            onReply={setReplyingTo} 
            onForward={() => {}}
            onDelete={triggerDeleteFlow}
            onEdit={setEditingMessage}
            onPin={() => togglePinMessage(chat.id, msg.id)}
            isPinned={pinnedMessageIds.includes(msg.id)}
            onMediaClick={handleMediaClick}
            senderUser={msg.senderId === otherId ? otherUser : null}
            />
        ))}
        <div className="h-4"></div>
      </div>

      {/* Floating Sticky Input Area */}
      <div className="p-3 lg:p-4 z-20 sticky bottom-0 safe-area-bottom w-full max-w-4xl mx-auto">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-800 p-2 flex flex-col gap-2">
            {replyingTo && (
                <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-xs border-l-4 border-indigo-500 animate-slide-in-from-bottom">
                    <div className="pl-2">
                        <span className="font-bold text-indigo-500 uppercase tracking-wider text-[10px]">Replying to</span>
                        <p className="truncate text-slate-500 max-w-[200px] font-medium">{replyingTo.text || 'Media'}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            )}
            
            <form onSubmit={handleSend} className="flex items-end gap-2">
                <div className="relative" ref={attachMenuRef}>
                    <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all active:scale-95">
                        <svg className={`w-6 h-6 transition-transform ${showAttachMenu ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </button>
                    {showAttachMenu && (
                        <div className="absolute bottom-full left-0 mb-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-2 flex flex-col gap-2 min-w-[160px] animate-in zoom-in-95 border border-slate-100 dark:border-slate-700">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300">
                                <span className="text-lg">📷</span> Gallery
                            </button>
                            <button type="button" onClick={() => { setShowPollModal(true); setShowAttachMenu(false); }} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300">
                                <span className="text-lg">📊</span> Poll
                            </button>
                            <button type="button" onClick={() => { setShowStickerPicker(true); setShowAttachMenu(false); }} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300">
                                <span className="text-lg">👾</span> Sticker
                            </button>
                        </div>
                    )}
                </div>
                
                <input 
                    ref={inputRef}
                    value={inputText}
                    onChange={handleInputChange}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium transition-all max-h-32 overflow-y-auto"
                    placeholder="Type a message..."
                />
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

                {inputText.trim() ? (
                    <button type="submit" className="p-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white shadow-lg shadow-indigo-500/30 shrink-0 active:scale-90 transition-transform">
                        <svg className="w-5 h-5 rotate-90 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                    </button>
                ) : (
                    <button type="button" className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 shrink-0 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                )}
            </form>
        </div>
      </div>

      {/* Modals Overlay */}
      {showGroupInfo && <GroupInfoModal chat={chat} currentUser={currentUser} onClose={() => setShowGroupInfo(false)} />}
      {viewingMedia && <MediaViewer message={viewingMedia} currentUser={currentUser} onClose={() => setViewingMedia(null)} onForward={() => {}} onReply={setReplyingTo} />}
      
      {showPollModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4">Create Poll</h3>
                  <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Question" className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl mb-3 font-bold" />
                  {pollOptions.map((opt, i) => (
                      <input key={i} value={opt} onChange={e => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} placeholder={`Option ${i+1}`} className="w-full bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg mb-2 text-sm" />
                  ))}
                  <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs font-bold text-indigo-500 mb-4">+ Add Option</button>
                  <div className="flex gap-2">
                      <button onClick={() => setShowPollModal(false)} className="flex-1 py-3 text-slate-500 font-bold">Cancel</button>
                      <button onClick={handleCreatePoll} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-bold">Create</button>
                  </div>
              </div>
          </div>
      )}

      {showStickerPicker && (
          <div className="fixed inset-0 z-[250] flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowStickerPicker(false)}></div>
              <div className="bg-white dark:bg-slate-900 rounded-t-[2rem] p-6 h-[50vh] relative z-10 overflow-y-auto grid grid-cols-4 gap-4 animate-slide-in-from-bottom">
                  {STICKERS.map((s, i) => (
                      <button key={i} onClick={() => handleSendSticker(s)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl hover:scale-110 transition-transform"><img src={s} className="w-full h-full object-contain" /></button>
                  ))}
              </div>
          </div>
      )}

      {showDeleteOptions && messageToDelete && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowDeleteOptions(false)}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <h3 className="text-xl font-black mb-6 text-center dark:text-white">Delete Message?</h3>
                <div className="flex flex-col gap-3">
                    {messageToDelete.senderId === currentUser.uid && (
                        <button onClick={() => confirmDelete('everyone')} className="w-full p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-500 font-bold hover:bg-red-100 transition-colors">Delete for everyone</button>
                    )}
                    <button onClick={() => confirmDelete('me')} className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition-colors">Delete for me</button>
                    <button onClick={() => setShowDeleteOptions(false)} className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-500 font-bold transition-colors">Cancel</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
