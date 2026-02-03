
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

const AI_BOT_ID = "gemini_ai";

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, currentUser, onClose, onUserClick, onCallStart, nicknames }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const isGroup = chat.type === 'group';
  const otherId = !isGroup ? chat.participants.find(p => p !== currentUser.uid) : null;
  const displayName = isGroup ? chat.name : (otherUser ? (nicknames[otherUser.uid] || otherUser.name) : 'Loading...');

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
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    const sync = async () => {
      const msgs = await getMessages(chat.id, currentUser.role !== 'user');
      setMessages(msgs);
    };
    sync();
    const itv = setInterval(sync, 2000); 
    return () => clearInterval(itv);
  }, [chat.id]);

  useEffect(() => {
    if (!isGroup && otherId) getUserById(otherId).then(setOtherUser);
  }, [otherId, isGroup]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setTypingStatus(chat.id, currentUser.uid, false);
    const recipient = isGroup ? chat.id : otherId!;
    
    const msg: Message = {
      id: 'm_' + Math.random().toString(36).substring(2, 11),
      senderId: currentUser.uid, 
      recipientId: recipient,
      text, 
      type: 'text', 
      timestamp: Date.now(), 
      status: 'sent',
      replyContext: replyingTo ? { messageId: replyingTo.id, text: replyingTo.text || 'Media', senderName: replyingTo.senderId === currentUser.uid ? 'You' : (otherUser?.name || 'User') } : undefined
    };

    setMessages(prev => [...prev, msg]);
    setInputText('');
    setReplyingTo(null);
    await addMessage(msg);
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
  };

  const renderDateSeparator = (timestamp: number, index: number) => {
      const date = new Date(timestamp);
      const prevDate = index > 0 ? new Date(messages[index-1].timestamp) : null;
      if (!prevDate || date.toDateString() !== prevDate.toDateString()) {
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <div className="py-6 flex justify-center w-full" key={`sep-${timestamp}`}>
                <p className="text-[#a19cba]/60 text-[10px] font-black uppercase tracking-[0.2em]">
                    {isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
            </div>
          );
      }
      return null;
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background-dark text-white font-display relative overflow-hidden bg-pattern">
      
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-40 header-glass">
        <div className="flex items-center p-4 justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
                <button onClick={onClose} className="flex items-center justify-center p-1 hover:bg-white/5 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-white">chevron_left</span>
                </button>
                <div className="relative shrink-0 cursor-pointer" onClick={() => isGroup ? setShowGroupInfo(true) : onUserClick(otherUser!)}>
                    <img 
                        src={isGroup ? (chat.groupIcon || `https://picsum.photos/seed/${chat.id}/200`) : otherUser?.photoURL} 
                        className="aspect-square rounded-full size-10 object-cover border border-white/10" 
                        alt="" 
                    />
                    {!isGroup && otherUser?.status === 'online' && (
                        <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-background-dark"></div>
                    )}
                </div>
                <div className="flex flex-col cursor-pointer" onClick={() => isGroup ? setShowGroupInfo(true) : onUserClick(otherUser!)}>
                    <h2 className="text-white text-base font-bold leading-tight tracking-tight truncate max-w-[150px]">{displayName}</h2>
                    <span className="text-[#a19cba] text-[10px] font-medium uppercase tracking-widest">
                        {isGroup ? `${chat.participants.length} members` : (otherUser?.status === 'online' ? 'Active Now' : 'Offline')}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!isGroup && (
                    <button onClick={() => onCallStart?.(otherUser!, 'video')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-white text-xl">videocam</span>
                    </button>
                )}
                <button onClick={() => isGroup ? setShowGroupInfo(true) : onUserClick(otherUser!)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-white text-xl">info</span>
                </button>
            </div>
        </div>
      </header>

      {/* Messages Area */}
      <main ref={scrollRef} className="flex-1 pt-24 pb-32 px-4 max-w-2xl mx-auto w-full flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
        {messages.map((msg, index) => (
            <React.Fragment key={msg.id}>
                {renderDateSeparator(msg.timestamp, index)}
                <MessageBubble 
                    message={msg} 
                    isOwn={msg.senderId === currentUser.uid} 
                    isAI={msg.senderId === AI_BOT_ID} 
                    onReply={setReplyingTo} 
                    onDelete={(m) => { setMessageToDelete(m); setShowDeleteOptions(true); }}
                    onMediaClick={setViewingMedia}
                    senderUser={!isGroup ? (msg.senderId === otherId ? otherUser : null) : null}
                    hideAvatar={index > 0 && messages[index-1].senderId === msg.senderId}
                />
            </React.Fragment>
        ))}
      </main>

      {/* Glassmorphism Input Bar */}
      <footer className="fixed bottom-0 w-full z-50 glass pb-10 pt-4 px-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
            {replyingTo && (
                <div className="flex items-center justify-between bg-white/5 px-4 py-2 rounded-2xl border border-white/5 mb-1 animate-in slide-in-from-bottom-2">
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">Replying to</span>
                        <p className="text-xs text-[#a19cba] truncate">{replyingTo.text || 'Media'}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-[#a19cba]"><span className="material-symbols-outlined text-sm">close</span></button>
                </div>
            )}
            
            <form onSubmit={handleSend} className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center rounded-full text-[#a19cba] hover:text-white transition-colors">
                        <span className="material-symbols-outlined">add_circle</span>
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center rounded-full text-[#a19cba] hover:text-white transition-colors">
                        <span className="material-symbols-outlined">photo_library</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                </div>
                
                <div className="flex-1 relative flex items-center">
                    <input 
                        value={inputText}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border-none rounded-full py-3.5 px-5 text-sm focus:ring-1 focus:ring-primary/50 text-white placeholder-[#a19cba]/50 transition-all outline-none" 
                        placeholder="Message..." 
                        type="text"
                    />
                    <button type="button" className="absolute right-3 text-[#a19cba] hover:text-white">
                        <span className="material-symbols-outlined text-xl">mood</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {inputText.trim() ? (
                        <button type="submit" className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-white glow-button active:scale-90 transition-all">
                            <span className="material-symbols-outlined fill-1">send</span>
                        </button>
                    ) : (
                        <button type="button" className="w-10 h-10 flex items-center justify-center rounded-full text-[#a19cba] hover:text-white transition-colors">
                            <span className="material-symbols-outlined">mic</span>
                        </button>
                    )}
                </div>
            </form>
        </div>
      </footer>

      {showDeleteOptions && messageToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-card-dark p-8 rounded-[2rem] border border-white/5 w-full max-w-sm text-center shadow-2xl">
                <h3 className="text-lg font-bold mb-4">Delete Message?</h3>
                <div className="flex flex-col gap-3">
                    <button onClick={async () => { await deleteMessageForEveryone(messageToDelete.id); setShowDeleteOptions(false); }} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white transition-all">Delete for Everyone</button>
                    <button onClick={async () => { await deleteMessageForMe(messageToDelete.id, currentUser.uid); setShowDeleteOptions(false); }} className="w-full py-4 bg-white/5 text-white rounded-2xl font-bold uppercase text-xs tracking-widest">Delete for me</button>
                    <button onClick={() => setShowDeleteOptions(false)} className="w-full py-2 text-[#a19cba] text-xs font-bold uppercase mt-2">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {showGroupInfo && <GroupInfoModal chat={chat} currentUser={currentUser} onClose={() => setShowGroupInfo(false)} />}
      {viewingMedia && <MediaViewer message={viewingMedia} currentUser={currentUser} onClose={() => setViewingMedia(null)} onForward={() => {}} onReply={setReplyingTo} />}
    </div>
  );
};
