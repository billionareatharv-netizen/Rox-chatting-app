
import React, { useState, useRef, useEffect, memo } from 'react';
import { Message, User } from '../../types';
import { toggleMessageReaction, auth } from '../../firebase';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isAI?: boolean;
  onReply: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onPin: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onVote: (msgId: string, optId: string) => void;
  onMediaClick?: (msg: Message) => void;
  senderUser?: User | null;
  hideAvatar?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({ 
    message, isOwn, onReply, onDelete, onPin, onForward, onEdit, onVote, onMediaClick, senderUser, hideAvatar 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const currentUid = auth.currentUser?.uid || '';

  const handleBubbleClick = (e: React.MouseEvent) => {
    if (message.type === 'deleted') return;
    // Don't open menu if clicking interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
  };

  const isDeleted = message.type === 'deleted';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const renderText = (text: string) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a 
                        key={i} 
                        href={part} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-white underline decoration-white/30 hover:decoration-white transition-all break-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const renderMessageContent = () => {
        if (isDeleted) return <span className="italic opacity-50">🚫 Message deleted</span>;
        
        switch (message.type) {
            case 'image':
                return <img src={message.fileUrl} className="rounded-lg max-h-60" onClick={() => onMediaClick?.(message)} alt="" />;
            case 'voice':
                return (
                    <div className="flex items-center gap-3 min-w-[200px] py-1">
                        <button 
                            onClick={togglePlay}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                        >
                            <span className="material-symbols-outlined text-white">
                                {isPlaying ? 'pause' : 'play_arrow'}
                            </span>
                        </button>
                        <div className="flex-1 flex flex-col gap-1">
                            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white w-1/3 rounded-full"></div>
                            </div>
                            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">
                                {Math.floor((message.duration || 0) / 60)}:{(message.duration || 0 % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                        <audio 
                            ref={audioRef} 
                            src={message.audioUrl} 
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                            className="hidden" 
                        />
                    </div>
                );
            case 'poll':
                return (
                    <div className="flex flex-col gap-3 min-w-[220px]">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-primary text-lg">poll</span>
                            <span className="font-bold tracking-tight">{message.poll?.question}</span>
                        </div>
                        {message.poll?.options.map(opt => {
                            const hasVoted = opt.votes.includes(currentUid);
                            return (
                                <button 
                                    key={opt.id} 
                                    onClick={(e) => { e.stopPropagation(); onVote(message.id, opt.id); }}
                                    className={`w-full p-3 border rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between ${hasVoted ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <span>{opt.text}</span>
                                    <span className="opacity-40">{opt.votes.length}</span>
                                </button>
                            );
                        })}
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Select an option to vote</p>
                    </div>
                );
            default:
                return renderText(message.text);
        }
    };

  if (isOwn) {
      return (
        <div className="flex flex-col items-end gap-1 mb-4 group animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-end gap-2 max-w-[85%]">
                <div className="flex flex-col gap-1 items-end relative">
                    {message.replyContext && (
                        <div className="bg-white/5 p-2 rounded-xl mb-1 text-[10px] border-l-2 border-primary/50 opacity-60 max-w-full truncate">
                            {message.replyContext.text}
                        </div>
                    )}
                    <div 
                        onClick={handleBubbleClick}
                        className={`text-sm font-medium leading-relaxed rounded-[1.25rem] rounded-br-none px-4 py-3 message-gradient text-white shadow-lg shadow-primary/20 cursor-pointer active:scale-95 transition-transform ${isDeleted ? 'opacity-50 italic' : ''}`}
                    >
                        {renderMessageContent()}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1.5 mr-1">
                        <p className="text-[#a19cba]/40 text-[9px] font-black uppercase tracking-widest">{time}</p>
                        <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {message.status === 'seen' ? 'done_all' : 'done'}
                        </span>
                    </div>

                    {showMenu && !isDeleted && (
                        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowMenu(false)}>
                            <div className="bg-card-dark p-6 rounded-[2.5rem] border border-white/10 w-full max-w-[calc(100vw-2rem)] sm:max-w-xs shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95" onClick={e => e.stopPropagation()}>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => { onReply(message); setShowMenu(false); }} className="flex flex-col items-center gap-2 py-5 bg-white/5 text-white rounded-3xl hover:bg-white/10 transition-all active:scale-95">
                                        <span className="material-symbols-outlined text-2xl">reply</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Reply</span>
                                    </button>
                                    <button onClick={() => { onForward(message); setShowMenu(false); }} className="flex flex-col items-center gap-2 py-5 bg-white/5 text-white rounded-3xl hover:bg-white/10 transition-all active:scale-95">
                                        <span className="material-symbols-outlined text-2xl">forward</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Forward</span>
                                    </button>
                                    <button onClick={() => { onPin(message); setShowMenu(false); }} className="flex flex-col items-center gap-2 py-5 bg-white/5 text-white rounded-3xl hover:bg-white/10 transition-all active:scale-95">
                                        <span className="material-symbols-outlined text-2xl">{message.isPinned ? 'keep_off' : 'keep'}</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{message.isPinned ? 'Unpin' : 'Pin'}</span>
                                    </button>
                                    {isOwn && message.type === 'text' && (
                                        <button onClick={() => { onEdit(message); setShowMenu(false); }} className="flex flex-col items-center gap-2 py-5 bg-white/5 text-white rounded-3xl hover:bg-white/10 transition-all active:scale-95">
                                            <span className="material-symbols-outlined text-2xl">edit</span>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Edit</span>
                                        </button>
                                    )}
                                    <button onClick={() => { onDelete(message); setShowMenu(false); }} className="col-span-2 flex items-center justify-center gap-4 py-5 bg-rose-500/10 text-rose-500 rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all active:scale-95">
                                        <span className="material-symbols-outlined text-lg">delete</span> Delete Message
                                    </button>
                                    <button onClick={() => setShowMenu(false)} className="col-span-2 py-4 text-[#a19cba] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Dismiss</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="flex items-end gap-3 mb-4 group animate-in slide-in-from-left-4 duration-300">
        <div className="w-8 shrink-0 mb-1">
            {!hideAvatar && !isOwn && (
                <img 
                    src={senderUser?.photoURL || `https://picsum.photos/seed/${message.senderId}/100`} 
                    className="aspect-square rounded-full w-8 h-8 object-cover border border-white/10" 
                    alt="" 
                />
            )}
        </div>
        <div className="flex flex-col gap-1 items-start max-w-[85%] relative">
            {!hideAvatar && !isOwn && (
                <span className="text-[9px] font-black text-[#a19cba]/60 uppercase tracking-widest mb-0.5 ml-1">
                    {senderUser?.name || 'User'}
                </span>
            )}
            <div 
                onClick={handleBubbleClick}
                className={`text-sm font-medium leading-relaxed rounded-[1.25rem] rounded-bl-none px-4 py-3 bg-[#1e1b2e] text-[#e2e1e9] cursor-pointer active:scale-95 transition-transform ${isDeleted ? 'opacity-50 italic' : ''}`}
            >
                {renderMessageContent()}
            </div>
            <p className="text-[#a19cba]/40 text-[9px] font-black uppercase tracking-widest mt-1.5 ml-1">{time}</p>

            {showMenu && !isDeleted && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowMenu(false)}>
                    <div className="bg-card-dark p-6 rounded-[2.5rem] border border-white/10 w-full max-w-[calc(100vw-2rem)] sm:max-w-xs shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => { onReply(message); setShowMenu(false); }} className="flex flex-col items-center gap-2 py-5 bg-white/5 text-white rounded-3xl hover:bg-white/10 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-2xl">reply</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Reply</span>
                            </button>
                            <button onClick={() => { onForward(message); setShowMenu(false); }} className="flex flex-col items-center gap-2 py-5 bg-white/5 text-white rounded-3xl hover:bg-white/10 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-2xl">forward</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Forward</span>
                            </button>
                            <button onClick={() => { onPin(message); setShowMenu(false); }} className="flex flex-col items-center gap-2 py-5 bg-white/5 text-white rounded-3xl hover:bg-white/10 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-2xl">{message.isPinned ? 'keep_off' : 'keep'}</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{message.isPinned ? 'Unpin' : 'Pin'}</span>
                            </button>
                            <button onClick={() => setShowMenu(false)} className="col-span-2 py-4 text-[#a19cba] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
});
