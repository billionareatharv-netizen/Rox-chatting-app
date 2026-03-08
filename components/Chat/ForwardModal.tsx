
import React, { useState, useEffect } from 'react';
import { User, Chat } from '../../types';
import { getMyChats, addMessage } from '../../firebase';

interface ForwardModalProps {
  currentUser: User;
  messageText: string;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ currentUser, messageText, onClose }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      const myChats = await getMyChats(currentUser.uid);
      setChats(myChats);
      setLoading(false);
    };
    fetchChats();
  }, [currentUser.uid]);

  const handleForwardTo = async (chat: Chat) => {
    const msg = {
        id: 'fwd_' + Date.now(),
        senderId: currentUser.uid,
        recipientId: chat.id,
        text: messageText,
        type: 'text',
        timestamp: Date.now(),
        status: 'sent',
        isForwarded: true
    };
    await addMessage(msg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="bg-card-dark p-8 rounded-[2.5rem] border border-white/10 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">forward</span>
            </div>
            <h3 className="text-xl font-black tracking-tight">Forward To</h3>
        </div>

        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto no-scrollbar">
          {loading ? (
              <p className="text-center text-[#a19cba] text-xs py-10">Loading chats...</p>
          ) : chats.length === 0 ? (
              <p className="text-center text-[#a19cba] text-xs py-10">No chats found</p>
          ) : chats.map(chat => (
            <button 
              key={chat.id}
              onClick={() => handleForwardTo(chat)}
              className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all text-left"
            >
              <img 
                src={chat.type === 'group' ? (chat.groupIcon || `https://picsum.photos/seed/${chat.id}/100`) : `https://picsum.photos/seed/${chat.id}/100`} 
                className="w-10 h-10 rounded-full object-cover border border-white/10"
                alt=""
              />
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-white truncate">{chat.name || 'Private Chat'}</span>
                <span className="text-[10px] text-[#a19cba] uppercase tracking-widest font-black">{chat.type}</span>
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 text-[#a19cba] text-[10px] font-black uppercase tracking-widest mt-4 border-t border-white/5 pt-6"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
