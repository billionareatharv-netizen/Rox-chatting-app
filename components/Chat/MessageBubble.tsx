import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../../types';

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
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, isAI, onReply, onForward, onDelete, onEdit, onPin, isPinned }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

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
        // Reset all other audios if needed, or just play this one
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

  const renderStatus = () => {
    if (!isOwn) return null;
    const isSeen = message.status === 'seen';
    const isDelivered = message.status === 'delivered' || isSeen;
    return (
      <div className={`flex -space-x-2 ${isSeen ? 'text-sky-400' : 'text-white/50'} ml-1`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" /></svg>
        {isDelivered && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" /></svg>}
      </div>
    );
  };

  const isDeleted = message.type === 'deleted';

  return (
    <div className={`relative flex w-full ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-2 group animate-in slide-in-from-${isOwn ? 'right' : 'left'}-4 duration-500`} id={`msg-${message.id}`}>
      {/* Swipe Indicator */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none" style={{ opacity: swipeOffset / 50, transform: `translateY(-50%) scale(${Math.min(swipeOffset / 50, 1.2)})` }}>
        <div className="bg-indigo-500 p-2 rounded-full text-white shadow-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></div>
      </div>

      <div className={`relative flex flex-col max-w-[82%] ${isOwn ? 'items-end' : 'items-start'} transition-transform duration-200`} style={{ transform: `translateX(${swipeOffset}px)` }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        
        {/* Context Menu */}
        {showMenu && !isDeleted && (
          <div ref={menuRef} className={`absolute z-50 bottom-full mb-3 bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-1.5 flex flex-col min-w-[150px] animate-in zoom-in-95 origin-bottom-${isOwn ? 'right' : 'left'}`}>
            <button onClick={() => { onReply(message); setShowMenu(false); }} className="px-4 py-2.5 hover:bg-indigo-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg> Reply
            </button>
            <button onClick={() => { onForward(message); setShowMenu(false); }} className="px-4 py-2.5 hover:bg-indigo-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg> Forward
            </button>
            {onPin && (
               <button onClick={() => { onPin(message); setShowMenu(false); }} className="px-4 py-2.5 hover:bg-indigo-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> {isPinned ? 'Unpin' : 'Pin'}
               </button>
            )}
            {isOwn && message.type === 'text' && onEdit && (
                <button onClick={() => { onEdit(message); setShowMenu(false); }} className="px-4 py-2.5 hover:bg-indigo-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Edit
                </button>
            )}
            {onDelete && (
                <button onClick={() => { onDelete(message); setShowMenu(false); }} className="px-4 py-2.5 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-left font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                </button>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div 
          onClick={() => !isDeleted && setShowMenu(!showMenu)} 
          className={`relative px-4 py-3 rounded-[1.75rem] transition-all active:scale-[0.97] cursor-pointer shadow-lg group-hover:shadow-xl overflow-hidden 
            ${isDeleted 
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 italic border border-slate-300 dark:border-slate-700' 
                : isOwn 
                    ? 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-600 text-white rounded-tr-none' 
                    : isAI 
                        ? 'bg-slate-900 text-white border-2 border-indigo-500/40 rounded-tl-none' 
                        : 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-900 dark:text-slate-100 rounded-tl-none border border-white/20 dark:border-slate-700/50'
            }`}
        >
          {isPinned && !isDeleted && (
             <div className="absolute top-0 right-0 p-1 bg-black/20 rounded-bl-xl text-white">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z"/></svg>
             </div>
          )}

          {message.replyContext && !isDeleted && (
            <div className={`mb-2 p-2 rounded-xl border-l-4 text-[11px] flex flex-col gap-0.5 ${isOwn ? 'bg-white/10 border-white/40' : 'bg-indigo-500/10 border-indigo-500 dark:bg-indigo-900/30'}`}>
              <span className={`font-black uppercase tracking-tighter ${isOwn ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`}>{message.replyContext.senderName}</span>
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
                    {/* Progress Bar */}
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
            <div className="relative mb-2 -mx-1 -mt-1 overflow-hidden rounded-2xl"><img src={message.fileUrl} className="max-h-80 w-full object-cover" alt="" /></div>
          ) : message.type === 'video' && message.fileUrl ? (
            <div className="relative mb-2 -mx-1 -mt-1 overflow-hidden rounded-2xl bg-black">
                <video src={message.fileUrl} controls playsInline className="max-h-80 w-full object-contain" onError={(e) => console.error("Video load failed", e)} />
            </div>
          ) : (
            <p className="text-[14.5px] leading-[1.45] font-medium whitespace-pre-wrap">{message.text}</p>
          )}

          <div className={`flex items-center gap-1.5 justify-end mt-1.5 ${isOwn ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>
            {message.isEdited && !isDeleted && <span className="text-[9px] italic mr-1">(edited)</span>}
            <span className="text-[9.5px] font-black uppercase tracking-tighter">{formatTime(message.timestamp)}</span>
            {renderStatus()}
          </div>
        </div>
      </div>
    </div>
  );
};
