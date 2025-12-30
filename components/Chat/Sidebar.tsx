
import React, { useState, useMemo, useEffect } from 'react';
import { User, Chat } from '../../types';
import { getAllUsers, getMyChats } from '../../firebase';
import { CreateGroupModal } from './CreateGroupModal';

interface SidebarProps {
  currentUser: User;
  onChatSelect: (chat: Chat) => void;
  activeChatId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, onChatSelect, activeChatId
}) => {
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    const sync = async () => {
      const users = await getAllUsers();
      const myBlocked = currentUser.blockedUsers || [];
      setAllUsers(users.filter(u => u.uid !== currentUser.uid && !myBlocked.includes(u.uid)));
      const myChats = await getMyChats(currentUser.uid);
      setChats(myChats);
    };
    sync();
    const itv = setInterval(sync, 4000);
    return () => clearInterval(itv);
  }, [currentUser]);

  const isRevealingLocked = currentUser.chatLockPassword && search === currentUser.chatLockPassword;

  const searchResults = useMemo(() => {
    const term = search.toLowerCase().trim();
    
    const visibleChats = chats.filter(c => {
      const isLocked = c.lockedBy?.includes(currentUser.uid);
      if (isRevealingLocked) return isLocked; 
      return !isLocked;
    });

    if (!term || isRevealingLocked) return { chats: visibleChats, users: [] };

    const matchedUsers = allUsers.filter(u => u.name.toLowerCase().includes(term));
    const matchedChats = visibleChats.filter(c => {
      if (c.type === 'group') return c.name?.toLowerCase().includes(term);
      const otherId = c.participants.find(p => p !== currentUser.uid);
      const user = allUsers.find(u => u.uid === otherId);
      return user?.name.toLowerCase().includes(term);
    });

    return { chats: matchedChats, users: matchedUsers.filter(u => !chats.some(c => c.type === 'private' && c.participants.includes(u.uid))) };
  }, [search, allUsers, chats, currentUser.uid, isRevealingLocked]);

  const handleStartNewChat = (user: User) => {
    const existing = chats.find(c => c.type === 'private' && c.participants.includes(user.uid));
    if (existing) onChatSelect(existing);
    else onChatSelect({
      id: [currentUser.uid, user.uid].sort().join('_'),
      type: 'private', participants: [currentUser.uid, user.uid],
      updatedAt: Date.now(), lockedBy: []
    });
    setSearch('');
  };

  const getChatInfo = (chat: Chat) => {
    if (chat.type === 'group') return { name: chat.name || 'Group', photo: chat.groupIcon || `https://picsum.photos/seed/${chat.id}/200` };
    const otherId = chat.participants.find(p => p !== currentUser.uid);
    const user = allUsers.find(u => u.uid === otherId);
    return { name: user?.name || 'Contact', photo: user?.photoURL || `https://picsum.photos/seed/${otherId}/200`, status: user?.status };
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 animate-in slide-in-from-left duration-300">
      <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-2xl font-black tracking-tight">Chats</h2>
        <button onClick={() => setShowGroupModal(true)} className="p-3 bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 rounded-2xl hover:bg-indigo-100 transition-all shadow-sm active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      <div className="p-4">
        <div className="relative group">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            {isRevealingLocked ? (
              <svg className="w-4 h-4 text-indigo-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6-5c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3z"/></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            )}
          </span>
          <input 
            type="text" placeholder={isRevealingLocked ? "Secret Vault Unlocked" : "Search conversations..."}
            value={search} onChange={(e) => setSearch(e.target.value)}
            className={`w-full border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none transition-all shadow-sm ${isRevealingLocked ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500' : 'bg-slate-100/80 dark:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500/40 focus:bg-white dark:focus:bg-slate-800'}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 px-3 pb-20 no-scrollbar">
        {isRevealingLocked && (
          <div className="px-4 py-3 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20 text-center animate-in fade-in slide-in-from-top-2">
             <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.25em]">Private Vault Unlocked</span>
          </div>
        )}
        
        {searchResults.chats.length === 0 && searchResults.users.length === 0 && (
          <div className="py-20 text-center px-6">
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">No conversations found.</p>
          </div>
        )}

        {searchResults.chats.map(chat => {
          const info = getChatInfo(chat);
          const isActive = activeChatId === chat.id;
          return (
            <div 
              key={chat.id} onClick={() => { onChatSelect(chat); if(isRevealingLocked) setSearch(''); }}
              className={`flex items-center gap-3.5 p-4 rounded-[2rem] cursor-pointer transition-all active:scale-[0.97] mb-1.5 ${isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
            >
              <div className="relative flex-shrink-0">
                <img src={info.photo} className="w-14 h-14 rounded-2xl object-cover shadow-sm" alt="" />
                {info.status === 'online' && !isActive && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-[15px] truncate">{info.name}</h4>
                  <span className={`text-[9px] font-bold uppercase tracking-tight ${isActive ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                    {chat.lastMessage ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={`text-[13px] truncate font-medium ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                    {chat.lastMessage?.text || 'Start chatting...'}
                  </p>
                  {chat.lockedBy?.includes(currentUser.uid) && !isActive && (
                    <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6-5c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3z"/></svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {searchResults.users.map(u => (
          <div key={u.uid} onClick={() => handleStartNewChat(u)} className="flex items-center gap-3.5 p-4 rounded-[2rem] cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group">
            <img src={u.photoURL} className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" alt="" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[15px] truncate">{u.name}</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">{u.status === 'online' ? 'Available' : 'Last seen recently'}</p>
            </div>
            <div className="p-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
               <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        ))}
      </div>

      {showGroupModal && <CreateGroupModal currentUser={currentUser} onClose={() => setShowGroupModal(false)} onCreated={onChatSelect} />}
    </div>
  );
};
