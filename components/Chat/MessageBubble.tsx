
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isAI?: boolean;
  onReply: (msg: Message) => void;
  onForward: (msg: Message) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, isAI, onReply, onForward }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    // Only allow swiping right (deltaX > 0)
    if (deltaX > 0) {
      const offset = Math.min(deltaX, 80); // Limit swipe distance
      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 50) {
      onReply(message);
    }
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const renderStatus = () => {
    if (!isOwn) return null;
    const isSeen = message.status === 'seen';
    const isDelivered = message.status === 'delivered' || isSeen;
    const color = isSeen ? 'text-sky-400' : 'text-white/50';

    return (
      <div className={`flex -space-x-2 ${color} ml-1`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
        </svg>
        {isDelivered && (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <div className={`relative flex w-full ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-2 group animate-in slide-in-from-${isOwn ? 'right' : 'left'}-4 duration-500`}>
      
      {/* Swipe Indicator (Reply Icon) */}
      <div 
        className="absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none"
        style={{ 
          opacity: swipeOffset / 50,
          transform: `translateY(-50%) scale(${Math.min(swipeOffset / 50, 1.2)})` 
        }}
      >
        <div className="bg-indigo-500 p-2 rounded-full text-white shadow-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </div>
      </div>

      <div 
        className={`relative flex flex-col max-w-[82%] ${isOwn ? 'items-end' : 'items-start'} transition-transform duration-200`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Context Menu */}
        {showMenu && (
          <div ref={menuRef} className={`absolute z-50 bottom-full mb-3 bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-1.5 flex flex-col min-w-[150px] animate-in zoom-in-95 origin-bottom-${isOwn ? 'right' : 'left'}`}>
            <button onClick={() => { onReply(message); setShowMenu(false); }} className="px-4 py-2.5 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 text-[11px] font-black uppercase tracking-widest rounded-xl text-left transition-all">Reply</button>
            <button onClick={() => { navigator.clipboard.writeText(message.text); setShowMenu(false); }} className="px-4 py-2.5 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 text-[11px] font-black uppercase tracking-widest rounded-xl text-left transition-all">Copy Text</button>
            <button onClick={() => { onForward(message); setShowMenu(false); setShowMenu(false); }} className="px-4 py-2.5 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 text-[11px] font-black uppercase tracking-widest rounded-xl text-left transition-all">Forward</button>
          </div>
        )}

        {/* Bubble Container */}
        <div 
          onClick={() => setShowMenu(!showMenu)}
          className={`relative px-4 py-3 rounded-[1.75rem] transition-all active:scale-[0.97] cursor-pointer shadow-lg group-hover:shadow-xl overflow-hidden ${
            isOwn 
            ? 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-600 text-white rounded-tr-none' 
            : isAI 
              ? 'bg-slate-900 text-white border-2 border-indigo-500/40 rounded-tl-none' 
              : 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-900 dark:text-slate-100 rounded-tl-none border border-white/20 dark:border-slate-700/50'
          }`}
        >
          {/* Reply Context Rendering */}
          {message.replyContext && (
            <div className={`mb-2 p-2 rounded-xl border-l-4 text-[11px] flex flex-col gap-0.5 ${
              isOwn 
              ? 'bg-white/10 border-white/40' 
              : 'bg-indigo-500/10 border-indigo-500 dark:bg-indigo-900/30'
            }`}>
              <span className={`font-black uppercase tracking-tighter ${isOwn ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`}>
                {message.replyContext.senderName}
              </span>
              <p className="truncate opacity-80 font-medium italic">
                {message.replyContext.text}
              </p>
            </div>
          )}

          {/* Media Handling */}
          {message.type === 'image' && message.fileUrl ? (
            <div className="relative mb-2 -mx-1 -mt-1 overflow-hidden rounded-2xl group/media">
              <img src={message.fileUrl} className="max-h-80 w-full object-cover transition-transform duration-500 group-hover/media:scale-105" alt="" />
            </div>
          ) : null}

          {/* Text Message */}
          {message.text && (
            <p className={`text-[14.5px] leading-[1.45] font-medium whitespace-pre-wrap`}>
              {message.text}
            </p>
          )}

          {/* Metadata Bar */}
          <div className={`flex items-center gap-1.5 justify-end mt-1.5 ${isOwn ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="text-[9.5px] font-black uppercase tracking-tighter">{formatTime(message.timestamp)}</span>
            {renderStatus()}
          </div>
        </div>
        
        {/* Forwarded Tag */}
        {message.isForwarded && (
          <div className={`mt-1 flex items-center gap-1 px-2 ${isOwn ? 'justify-end' : 'justify-start'} opacity-40 italic`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            <span className="text-[10px] font-bold uppercase">Forwarded</span>
          </div>
        )}
      </div>
    </div>
  );
};
