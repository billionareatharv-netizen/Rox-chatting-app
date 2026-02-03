
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Chat } from '../../types';
import { getAllUsers, getMyChats, togglePinChat, subscribeToUser } from '../../firebase';
import { CreateGroupModal } from './CreateGroupModal';
import { AppGallery } from './AppGallery';
import { AccountSwitchModal } from './AccountSwitchModal';
import { PremiumStore } from '../Premium/PremiumStore';
import { ROLE_STYLES, getBadgeIcon } from '../../premiumUtils';

interface SidebarProps {
  currentUser: User;
  onChatSelect: (chat: Chat) => void;
  activeChatId?: string;
  nicknames: Record<string, string>; 
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, onChatSelect, activeChatId, nicknames
}) => {
  const [search, setSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  
  const [showMenu, setShowMenu] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showAccountSwitch, setShowAccountSwitch] = useState(false);

  useEffect(() => {
    const unsubUser = subscribeToUser(currentUser.uid, (data) => {
        setPinnedChats(data.pinnedChats || []);
    });

    const fetchData = async () => {
      try {
        const [usersData, chatsData] = await Promise.all([
            getAllUsers(),
            getMyChats(currentUser.uid)
        ]);
        const myBlocked = currentUser.blockedUsers || [];
        setAllUsers(usersData.filter(u => u.uid !== currentUser.uid && !myBlocked.includes(u.uid)));
        setChats(chatsData);
        setLoading(false);
      } catch(e) { }
    };

    fetchData();
    const itv = setInterval(fetchData, 5000);
    return () => { unsubUser(); clearInterval(itv); };
  }, [currentUser.uid]);

  const searchResults = useMemo(() => {
    const term = search.toLowerCase().trim();
    let visibleChats = chats.filter(c => !c.lockedBy?.includes(currentUser.uid));
    
    visibleChats.sort((a, b) => {
        const isAPinned = pinnedChats.includes(a.id);
        const isBPinned = pinnedChats.includes(b.id);
        if (isAPinned && !isBPinned) return -1;
        if (!isAPinned && isBPinned) return 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    if (!term) return { chats: visibleChats, users: [] };
    const matchedUsers = allUsers.filter(u => (nicknames[u.uid] || u.name).toLowerCase().includes(term));
    const matchedChats = visibleChats.filter(c => {
      const name = c.type === 'group' ? c.name : (nicknames[c.participants.find(p=>p!==currentUser.uid)!] || 'User');
      return name?.toLowerCase().includes(term);
    });
    return { chats: matchedChats, users: matchedUsers };
  }, [search, allUsers, chats, currentUser.uid, pinnedChats, nicknames]);

  const getChatInfo = (chat: Chat) => {
    if (chat.type === 'group') return { name: chat.name || 'Group', photo: chat.groupIcon || `https://picsum.photos/seed/${chat.id}/200` };
    const otherId = chat.participants.find(p => p !== currentUser.uid);
    const user = allUsers.find(u => u.uid === otherId);
    return { name: user ? (nicknames[user.uid] || user.name) : 'User', photo: user?.photoURL || `https://picsum.photos/seed/${otherId}/200`, userObj: user };
  };

  return (
    <div className="w-full h-full flex flex-col bg-background-light dark:bg-background-dark animate-in slide-in-from-left duration-300">
      {/* Header */}
      <div className="h-20 px-6 flex items-center justify-between shrink-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-border-dark sticky top-0 z-10">
         <div>
            <h2 className="text-xl font-bold tracking-tight">Messages</h2>
            <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">{chats.length} Active Conversations</p>
         </div>
         <div className="flex gap-2">
            <button onClick={()=>setShowGroupModal(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-primary hover:text-white transition-all">
                <span className="material-symbols-outlined text-xl">add_comment</span>
            </button>
            <button onClick={()=>setShowMenu(!showMenu)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <span className="material-symbols-outlined text-xl">more_vert</span>
            </button>
         </div>
      </div>

      {showMenu && (
          <div className="absolute right-6 top-16 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-2 z-50 w-48 border border-gray-100 dark:border-border-dark animate-in zoom-in-95">
              <button onClick={()=>{setShowGallery(true); setShowMenu(false)}} className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-bold flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">photo_library</span> Gallery
              </button>
              <button onClick={()=>{setShowAccountSwitch(true); setShowMenu(false)}} className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-bold flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">sync_alt</span> Switch Account
              </button>
          </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 no-scrollbar">
          {searchResults.chats.map(chat => {
              const info = getChatInfo(chat);
              const isActive = activeChatId === chat.id;
              const isPinned = pinnedChats.includes(chat.id);
              
              return (
                  <div 
                    key={chat.id} 
                    onClick={() => onChatSelect(chat)} 
                    className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-white dark:hover:bg-card-dark border border-transparent hover:border-gray-100 dark:hover:border-border-dark'}`}
                  >
                      <div className="relative">
                          <img src={info.photo} className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm" alt="" />
                          {info.userObj?.status === 'online' && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-background-dark"></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                              <h4 className="font-bold text-[15px] truncate">{info.name}</h4>
                              <span className={`text-[10px] font-bold ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                                  {chat.lastMessage ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}
                              </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={`text-[13px] truncate ${isActive ? 'text-white/70' : 'text-slate-500'}`}>{chat.lastMessage?.text || 'Start chatting...'}</p>
                            {isPinned && <span className="material-symbols-outlined text-sm rotate-45">push_pin</span>}
                          </div>
                      </div>
                  </div>
              );
          })}
      </div>

      {showGroupModal && <CreateGroupModal currentUser={currentUser} onClose={() => setShowGroupModal(false)} onCreated={onChatSelect} />}
      {showGallery && <AppGallery currentUser={currentUser} onClose={() => setShowGallery(false)} />}
      {showAccountSwitch && <AccountSwitchModal currentUser={currentUser} onClose={() => setShowAccountSwitch(false)} />}
      {showStore && <PremiumStore currentUser={currentUser} onClose={() => setShowStore(false)} />}
    </div>
  );
};
