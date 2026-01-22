import React, { useState, useRef, useEffect } from 'react';
import { Message, PollOption } from '../../types';
import { toggleMessageReaction, voteOnPoll, auth } from '../../firebase';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isAI?: boolean;
  onReply: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onDelete?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  onPin?: (msg: Message) => void;
  isPinned?: boolean;
  onMediaClick?: (msg: Message) => void;
}

const COMMON_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, isAI, onReply, onForward, onDelete, onEdit, onPin, isPinned, onMediaClick }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('top');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const touchStartX = useRef<number | null>(null);
  const currentUid = auth.currentUser?.uid || '';

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { 
        if (menuRef.current && !menuRef.current.contains(e.target as Node) && bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
            setShowMenu(false);
            setShowReactions(false);
        }
    };
    if (showMenu || showReactions) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu, showReactions]);

  const handleBubbleClick = (e: React.MouseEvent) => {
    if (isDeleted) return;
    e.stopPropagation();

    if (!showMenu) {
        // Calculate available space
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const spaceAbove = rect.top;
        // If less than 280px above (approx header + menu height), show menu BELOW
        if (spaceAbove < 280) {
            setMenuPlacement('bottom');
        } else {
            setMenuPlacement('top');
        }
        setShowMenu(true);
    } else {
        setShowMenu(false);
        setShowReactions(false);
    }
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    if (deltaX > 0) setSwipeOffset(Math.min(deltaX, 80));
  };
  const handleTouchEnd = () => {
    if (swipeOffset > 50) onReply(message);
    setSwipeOffset(0);
    touchStartX.current = null;
  };

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        document.querySelectorAll('audio').forEach(a => { if(a !== audio) a.pause() });
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.error("Audio play error:", e);
            setIsPlaying(false);
          });
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
        setCurrentTime(audio.currentTime);
        if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
        }
    }
  };

  const handleReaction = async (emoji: string) => {
    await toggleMessageReaction(message.id, emoji, currentUid);
    setShowReactions(false);
    setShowMenu(false);
  };

  const handleVote = async (optionId: string) => {
    await voteOnPoll(message.id, optionId, currentUid);
  };

  const renderStatus = () => {
    if (!isOwn) return null;
    const isSeen = message.status === 'seen';
    
    if (isSeen) {
       return null; 
    }

    return (
      <div className="flex -space-x-1 text-black/60 dark:text-white/60 ml-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
      </div>
    );
  };

  const isDeleted = message.type === 'deleted';
  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

  return (
    <div className={`relative flex flex-col w-full ${isOwn ? 'items-end' : 'items-start'} ${hasReactions ? 'mb-6' : 'mb-2'} px-2 group animate-in slide-in-from-${isOwn ? 'right' : 'left'}-4 duration-300`} id={`msg-${message.id}`}>
      
      {/* Swipe Indicator */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none opacity-0"></div>

      <div className={`relative flex flex-col max-w-[85%] sm:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} transition-transform duration-200`} style={{ transform: `translateX(${swipeOffset}px)` }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        
        {/* Context Menu & Reactions */}
        <div ref={menuRef}>
            {/* Reaction Picker Bubble */}
            {showReactions && !isDeleted && (
                <div className={`absolute z-[110] ${menuPlacement === 'top' ? 'bottom-full mb-16' : 'top-full mt-16'} bg-white dark:bg-slate-800 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 p-2 flex gap-2 animate-in zoom-in-95 ${isOwn ? 'right-0' : 'left-0'}`}>
                    {COMMON_REACTIONS.map(emoji => (
                        <button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-125 transition-transform active:scale-90 p-1">
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* Main Menu */}
            {showMenu && !isDeleted && (
            <div className={`absolute z-[100] ${menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-1.5 flex flex-col min-w-[160px] animate-in zoom-in-95 origin-${menuPlacement}-${isOwn ? 'right' : 'left'} ${isOwn ? 'right-0' : 'left-0'}`}>
                <button onClick={() => setShowReactions(!showReactions)} className="px-4 py-3 hover:bg-indigo-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-200 transition-colors">
                    <span className="text-lg leading-none">😊</span> React
                </button>
                <button onClick={() => { onReply(message); setShowMenu(false); }} className="px-4 py-3 hover:bg-indigo-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg> Reply
                </button>
                <button onClick={() => { onForward(message); setShowMenu(false); }} className="px-4 py-3 hover:bg-indigo-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg> Forward
                </button>
                {onPin && (
                <button onClick={() => { onPin(message); setShowMenu(false); }} className="px-4 py-3 hover:bg-indigo-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> {isPinned ? 'Unpin' : 'Pin'}
                </button>
                )}
                {isOwn && message.type === 'text' && onEdit && (
                    <button onClick={() => { onEdit(message); setShowMenu(false); }} className="px-4 py-3 hover:bg-indigo-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-200 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Edit
                    </button>
                )}
                {onDelete && (
                    <button onClick={() => { onDelete(message); setShowMenu(false); }} className="px-4 py-3 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                    </button>
                )}
            </div>
            )}
        </div>

        {/* Message Bubble Content */}
        <div 
          ref={bubbleRef}
          onClick={handleBubbleClick}
          className={`relative px-4 py-3 rounded-[1.2rem] transition-all active:scale-[0.99] cursor-pointer shadow-sm group-hover:shadow-md overflow-hidden 
            ${message.type === 'sticker' 
                ? 'bg-transparent shadow-none p-0' 
                : isDeleted 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 italic border border-slate-200 dark:border-slate-700' 
                    : isOwn 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : isAI 
                            ? 'bg-slate-800 text-white border border-indigo-500/30 rounded-tl-none' 
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-700'
            }`}
        >
          {isPinned && !isDeleted && (
             <div className="absolute top-0 right-0 p-1 bg-black/20 rounded-bl-lg text-white">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z"/></svg>
             </div>
          )}

          {message.replyContext && !isDeleted && (
            <div className={`mb-2 p-2 rounded-lg border-l-2 text-[11px] flex flex-col gap-0.5 ${isOwn ? 'bg-white/10 border-white/50' : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500'}`}>
              <span className={`font-black uppercase tracking-tight ${isOwn ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>{message.replyContext.senderName}</span>
              <p className="truncate opacity-80 font-medium italic">{message.replyContext.text}</p>
            </div>
          )}

          {isDeleted ? (
              <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  <span className="text-sm font-medium">{message.text}</span>
              </div>
          ) : message.type === 'voice' && message.audioUrl ? (
             <div className="flex items-center gap-3 min-w-[180px]">
                <button onClick={(e) => { e.stopPropagation(); toggleAudio(); }} className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}>
                   {isPlaying ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                </button>
                <div className="flex flex-col gap-1 w-full">
                    <div className={`h-1.5 rounded-full w-32 relative overflow-hidden ${isOwn ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <div 
                            className={`h-full rounded-full transition-all duration-100 ease-linear ${isOwn ? 'bg-white' : 'bg-indigo-500'}`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between w-32">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isOwn ? 'text-white/70' : 'text-slate-500'}`}>
                            {isPlaying ? `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}` : (message.duration ? `${Math.floor(message.duration / 60)}:${(message.duration % 60).toString().padStart(2, '0')}` : 'Voice')}
                        </span>
                    </div>
                </div>
                {message.audioUrl && (
                  <audio 
                    ref={audioRef} 
                    src={message.audioUrl} 
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => { setIsPlaying(false); setProgress(0); setCurrentTime(0); }}
                    onTimeUpdate={handleTimeUpdate}
                    onError={(e) => {
                      console.error("Audio load failed", e);
                      setIsPlaying(false);
                    }}
                    className="hidden" 
                    preload="metadata"
                  />
                )}
             </div>
          ) : message.type === 'image' && message.fileUrl ? (
            <div 
                className="relative mb-2 -mx-1 -mt-1 overflow-hidden rounded-xl cursor-zoom-in"
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if(onMediaClick) onMediaClick(message); 
                }}
            >
                <img src={message.fileUrl} className="max-h-80 w-full object-cover" alt="" />
            </div>
          ) : message.type === 'video' && message.fileUrl ? (
            <div 
                className="relative mb-2 -mx-1 -mt-1 overflow-hidden rounded-xl bg-black cursor-pointer"
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if(onMediaClick) onMediaClick(message); 
                }}
            >
                <video src={message.fileUrl} className="max-h-80 w-full object-contain pointer-events-none" onError={(e) => console.error("Video load failed", e)} />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                     <div className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 shadow-xl">
                        <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                     </div>
                </div>
            </div>
          ) : message.type === 'sticker' && message.stickerUrl ? (
             <div className="w-32 h-32 hover:scale-105 transition-transform">
                <img src={message.stickerUrl} alt="Sticker" className="w-full h-full object-contain" />
             </div>
          ) : message.type === 'poll' && message.poll ? (
             <div className="min-w-[220px]">
                <h4 className="font-bold text-sm mb-3">{message.poll.question}</h4>
                <div className="space-y-2">
                    {message.poll.options.map((opt: PollOption) => {
                        const totalVotes = message.poll!.options.reduce((acc: number, o: PollOption) => {
                           const votes = (o.votes || []) as string[];
                           return acc + votes.length;
                        }, 0);
                        const votes = (opt.votes || []) as string[];
                        const voteCount = votes.length;
                        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                        const hasVoted = votes.includes(currentUid);

                        return (
                            <button 
                                key={opt.id}
                                onClick={(e) => { e.stopPropagation(); handleVote(opt.id); }}
                                className={`w-full relative h-10 rounded-lg overflow-hidden border transition-all ${hasVoted ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-600'}`}
                            >
                                <div className={`absolute inset-y-0 left-0 bg-indigo-100 dark:bg-indigo-900/30 transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                                <div className="absolute inset-0 flex items-center justify-between px-3">
                                    <span className={`text-xs font-bold z-10 ${isOwn ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{opt.text} {hasVoted && '✓'}</span>
                                    <span className={`text-[10px] font-bold z-10 ${isOwn ? 'text-white/80' : 'text-slate-500'}`}>{percentage}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-2 text-[10px] opacity-70 font-bold uppercase tracking-wider text-center">
                    {message.poll.options.reduce((acc: number, o: PollOption) => {
                        const votes = (o.votes || []) as string[];
                        return acc + votes.length;
                    }, 0)} votes
                </div>
             </div>
          ) : (
            <p className="text-[14px] leading-[1.5] font-medium whitespace-pre-wrap">{message.text}</p>
          )}

          {message.type !== 'sticker' && (
            <div className={`flex items-center gap-1 justify-end mt-1 ${isOwn ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                {message.isEdited && !isDeleted && <span className="text-[9px] italic mr-1">(edited)</span>}
                <span className="text-[9px] font-bold uppercase tracking-tight">{formatTime(message.timestamp)}</span>
                {renderStatus()}
            </div>
          )}
        </div>

        {/* Seen Just Now Text */}
        {isOwn && message.status === 'seen' && (
            <span className="text-[9px] font-bold text-slate-400 mt-1 self-end mr-1 animate-in fade-in">
                Seen just now
            </span>
        )}

        {/* Reaction Pill Display */}
        {hasReactions && !isDeleted && (
            <div className={`absolute -bottom-5 ${isOwn ? 'right-2' : 'left-2'} flex gap-1 z-10`}>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-full px-1.5 py-0.5 shadow-md border border-slate-100 dark:border-slate-700">
                    {Object.entries(message.reactions || {}).slice(0, 3).map(([emoji, users]) => (
                        <span key={emoji} className="text-[10px] leading-none" title={`${(users as string[]).length} reaction(s)`}>{emoji}</span>
                    ))}
                    <span className="text-[9px] font-bold text-slate-500 px-1">
                        {Object.values(message.reactions || {}).reduce((acc: number, u: any) => acc + (u as string[]).length, 0)}
                    </span>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};