
import React, { useState, useRef, useEffect, memo } from 'react';
import { Message, User } from '../../types';
import { toggleMessageReaction, voteOnPoll, auth } from '../../firebase';
import { ROLE_STYLES } from '../../premiumUtils';

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
  senderUser?: User | null;
}

const COMMON_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({ 
    message, isOwn, isAI, onReply, onDelete, onEdit, onMediaClick, senderUser 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const currentUid = auth.currentUser?.uid || '';

  // Handle outside click
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
    if (message.type === 'deleted') return;
    e.stopPropagation();
    if (!showMenu) setShowMenu(true);
    else { setShowMenu(false); setShowReactions(false); }
  };

  const handleReaction = async (emoji: string) => {
    await toggleMessageReaction(message.id, emoji, currentUid);
    setShowReactions(false);
    setShowMenu(false);
  };

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

  // Determine Bubble Style
  let bubbleStyle = 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm';
  let badge = null;

  if (message.type === 'deleted') {
      bubbleStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-500 italic border border-slate-200 dark:border-slate-700';
  } else if (isOwn) {
      bubbleStyle = 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 border-0';
      // Use premium role styles if user has one
      const myRole = auth.currentUser ? (auth.currentUser as any).role : 'user'; // Basic check, better passed prop
      // Since we don't have full currentUser object easily here, we rely on default premium look for self.
  } else if (isAI) {
      bubbleStyle = 'bg-slate-800 text-white border border-indigo-500/30';
  } else if (senderUser) {
      // Check for Admin/Founder roles
      if (senderUser.role === 'owner') {
          bubbleStyle = 'bg-gradient-to-r from-red-900 to-slate-900 text-white border border-red-500/30 shadow-[0_0_15px_rgba(220,38,38,0.1)]';
          badge = <span className="text-[8px] font-black text-red-400 uppercase tracking-widest ml-2 border border-red-500/30 px-1 rounded">FOUNDER</span>;
      } else if (senderUser.role === 'admin' || senderUser.isAdmin) {
          bubbleStyle = 'bg-gradient-to-r from-amber-900/80 to-slate-900 text-white border border-amber-500/30';
          badge = <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest ml-2 border border-amber-500/30 px-1 rounded">ADMIN</span>;
      }
  }

  const isDeleted = message.type === 'deleted';

  return (
    <div className={`relative flex flex-col w-full ${isOwn ? 'items-end' : 'items-start'} mb-2 px-2 group animate-in slide-in-from-bottom-1`} id={`msg-${message.id}`}>
      
      <div 
        className={`relative flex flex-col max-w-[85%] lg:max-w-[65%] transition-transform duration-200`} 
        style={{ transform: `translateX(${swipeOffset}px)` }} 
        onTouchStart={handleTouchStart} 
        onTouchMove={handleTouchMove} 
        onTouchEnd={handleTouchEnd}
      >
        
        {!isOwn && !isDeleted && senderUser && (
            <div className="flex items-center mb-1 ml-1">
                <span className={`text-[10px] font-bold ${senderUser.role === 'owner' ? 'text-red-500' : 'text-slate-500'}`}>
                    {senderUser.name}
                </span>
                {badge}
            </div>
        )}

        {/* Menu Popover */}
        {showMenu && !isDeleted && (
            <div className={`absolute z-20 ${isOwn ? 'right-0' : 'left-0'} -top-12 bg-black/80 backdrop-blur-md text-white rounded-full flex items-center px-2 py-1 shadow-xl animate-in zoom-in-90`}>
                <button onClick={() => setShowReactions(!showReactions)} className="p-2 hover:text-yellow-400">😊</button>
                <div className="w-px h-3 bg-white/20 mx-1"></div>
                <button onClick={() => onReply(message)} className="p-2 text-xs font-bold uppercase">Reply</button>
                {onDelete && <button onClick={() => onDelete(message)} className="p-2 text-xs font-bold uppercase text-red-400 ml-2">Del</button>}
            </div>
        )}

        {/* Reaction Popover */}
        {showReactions && (
            <div className={`absolute z-30 ${isOwn ? 'right-0' : 'left-0'} -top-24 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-xl flex gap-2 animate-in zoom-in`}>
                {COMMON_REACTIONS.map(e => <button key={e} onClick={() => handleReaction(e)} className="text-2xl hover:scale-125 transition-transform">{e}</button>)}
            </div>
        )}

        <div 
          ref={bubbleRef}
          onClick={handleBubbleClick}
          className={`relative px-4 py-3 rounded-[1.25rem] ${isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${bubbleStyle} overflow-hidden`}
        >
          {message.replyContext && !isDeleted && (
             <div className="mb-2 p-2 rounded-lg bg-black/10 border-l-2 border-white/50 text-xs">
                 <span className="font-bold opacity-80">{message.replyContext.senderName}</span>
                 <p className="opacity-60 truncate">{message.replyContext.text}</p>
             </div>
          )}

          {isDeleted ? (
              <span className="text-sm">🚫 Message deleted</span>
          ) : message.type === 'image' && message.fileUrl ? (
            <div onClick={(e) => { e.stopPropagation(); onMediaClick?.(message); }} className="rounded-xl overflow-hidden mb-1 -mx-1 -mt-1">
                <img src={message.fileUrl} className="max-h-64 w-full object-cover" loading="lazy" />
            </div>
          ) : (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{message.text}</p>
          )}

          <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'opacity-70' : 'opacity-50'}`}>
             <span className="text-[9px] font-bold uppercase">{new Date(message.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
             {isOwn && !isDeleted && message.status === 'seen' && (
                 <span className="text-[10px] text-white">✓✓</span>
             )}
          </div>
        </div>

        {/* Reactions Display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && !isDeleted && (
            <div className={`absolute -bottom-3 ${isOwn ? 'right-2' : 'left-2'} bg-white dark:bg-slate-800 rounded-full px-1.5 py-0.5 shadow-md flex items-center gap-1 border border-slate-100 dark:border-slate-700 z-10`}>
                {Object.entries(message.reactions).slice(0,3).map(([e, u]) => <span key={e} className="text-[10px]">{e}</span>)}
                <span className="text-[9px] font-bold text-slate-500">{Object.values(message.reactions).flat().length}</span>
            </div>
        )}
      </div>
    </div>
  );
});
