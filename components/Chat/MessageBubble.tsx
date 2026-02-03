
import React, { useState, useRef, useEffect, memo } from 'react';
import { Message, User } from '../../types';
import { toggleMessageReaction, auth } from '../../firebase';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isAI?: boolean;
  onReply: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onMediaClick?: (msg: Message) => void;
  senderUser?: User | null;
  hideAvatar?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({ 
    message, isOwn, onReply, onDelete, onMediaClick, senderUser, hideAvatar 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const currentUid = auth.currentUser?.uid || '';

  const handleBubbleClick = (e: React.MouseEvent) => {
    if (message.type === 'deleted') return;
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const isDeleted = message.type === 'deleted';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
                        {isDeleted ? '🚫 Message deleted' : message.type === 'image' ? (
                            <img src={message.fileUrl} className="rounded-lg max-h-60" onClick={() => onMediaClick?.(message)} alt="" />
                        ) : message.text}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1.5 mr-1">
                        <p className="text-[#a19cba]/40 text-[9px] font-black uppercase tracking-widest">{time}</p>
                        <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {message.status === 'seen' ? 'done_all' : 'done'}
                        </span>
                    </div>

                    {showMenu && !isDeleted && (
                        <div className="absolute right-0 bottom-full mb-2 bg-card-dark border border-white/10 p-2 rounded-2xl shadow-2xl z-20 flex flex-col gap-1 min-w-[120px] animate-in zoom-in-95">
                            <button onClick={() => onReply(message)} className="text-[10px] font-black uppercase text-white p-2 text-left hover:bg-white/5 rounded-xl">Reply</button>
                            <button onClick={() => onDelete(message)} className="text-[10px] font-black uppercase text-red-500 p-2 text-left hover:bg-red-500/10 rounded-xl">Delete</button>
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
                {isDeleted ? '🚫 Message deleted' : message.type === 'image' ? (
                    <img src={message.fileUrl} className="rounded-lg max-h-60" onClick={() => onMediaClick?.(message)} alt="" />
                ) : message.text}
            </div>
            <p className="text-[#a19cba]/40 text-[9px] font-black uppercase tracking-widest mt-1.5 ml-1">{time}</p>

            {showMenu && !isDeleted && (
                <div className="absolute left-0 bottom-full mb-2 bg-card-dark border border-white/10 p-2 rounded-2xl shadow-2xl z-20 flex flex-col gap-1 min-w-[120px] animate-in zoom-in-95">
                    <button onClick={() => onReply(message)} className="text-[10px] font-black uppercase text-white p-2 text-left hover:bg-white/5 rounded-xl">Reply</button>
                    <button className="text-[10px] font-black uppercase text-white p-2 text-left hover:bg-white/5 rounded-xl">React</button>
                </div>
            )}
        </div>
    </div>
  );
});
