
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

const SidebarSkeleton = () => (
  <div className="space-y-4 p-4 animate-pulse">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
        </div>
      </div>
    ))}
  </div>
);

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

  const searchInputRef = useRef<HTMLInputElement>(null);

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
      } catch(e) {
        console.error(e);
      }
    };

    fetchData();
    
    const itv = setInterval(async () => {
       const chatsData = await getMyChats(currentUser.uid);
       setChats(prev => {
         if (prev.length === chatsData.length && prev[0]?.lastMessage?.timestamp === chatsData[0]?.lastMessage?.timestamp) return prev;
         return chatsData;
       });
    }, 5000);

    return () => {
        unsubUser();
        clearInterval(itv);
    };
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
    return { 
        name: user ? (nicknames[user.uid] || user.name) : 'User', 
        photo: user?.photoURL || `https://picsum.photos/seed/${otherId}/200`, 
        userObj: user 
    };
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 animate-in slide-in-from-left duration-300 relative border-r border-slate-100 dark:border-slate-800">
      {/* Header */}
      <div className="h-20 px-5 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 sticky top-0">
         {isSearchOpen ? (
             <div className="flex-1 flex bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2">
                 <input autoFocus ref={searchInputRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="bg-transparent flex-1 outline-none text-sm" />
                 <button onClick={()=>setIsSearchOpen(false)}>✕</button>
             </div>
         ) : (
             <>
                <div>
                    <h2 className="text-xl font-bold dark:text-white">Messages</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{chats.length} chats</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={()=>setShowStore(true)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors">🛍️</button>
                    <button onClick={()=>setIsSearchOpen(true)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">🔍</button>
                    <button onClick={()=>setShowMenu(!showMenu)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">⋮</button>
                </div>
             </>
         )}
         {showMenu && (
             <div className="absolute right-4 top-16 bg-white dark:bg-slate-800 shadow-xl rounded-xl p-2 z-50 flex flex-col w-48 border border-slate-100 dark:border-slate-700">
                 <button onClick={()=>{setShowGroupModal(true); setShowMenu(false)}} className="p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-bold">Create Group</button>
                 <button onClick={()=>{setShowGallery(true); setShowMenu(false)}} className="p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-bold">Gallery</button>
                 <button onClick={()=>{setShowAccountSwitch(true); setShowMenu(false)}} className="p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-bold">Switch Account</button>
             </div>
         )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 px-3 pb-24 no-scrollbar pt-2">
        {loading ? <SidebarSkeleton /> : (
            <>
                {searchResults.chats.length === 0 && searchResults.users.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">No chats found.</div>
                )}
                {searchResults.chats.map(chat => {
                    const info = getChatInfo(chat);
                    const isActive = activeChatId === chat.id;
                    const isPinned = pinnedChats.includes(chat.id);
                    
                    // Determine styling based on role
                    let borderClass = 'border-2 border-transparent';
                    if (info.userObj?.role === 'owner') borderClass = ROLE_STYLES.owner.border;
                    else if (info.userObj?.role === 'admin') borderClass = ROLE_STYLES.admin.border;

                    return (
                        <div key={chat.id} onClick={() => onChatSelect(chat)} className={`flex items-center gap-4 p-3.5 rounded-[1.2rem] cursor-pointer transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                            <div className="relative">
                                <img src={info.photo} className={`w-12 h-12 rounded-full object-cover ${borderClass}`} alt="" />
                                {info.userObj?.status === 'online' && !isActive && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between">
                                    <h4 className="font-bold text-[15px] truncate flex items-center gap-1">
                                        {info.name}
                                        {info.userObj?.role === 'owner' && <span className="text-[10px]">{ROLE_STYLES.owner.icon}</span>}
                                    </h4>
                                    <span className="text-[10px] opacity-70">{chat.lastMessage ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-[13px] truncate opacity-70">{chat.lastMessage?.text || 'No messages'}</p>
                                    {isPinned && <span className="text-[10px]">📌</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </>
        )}
      </div>

      {showGroupModal && <CreateGroupModal currentUser={currentUser} onClose={() => setShowGroupModal(false)} onCreated={onChatSelect} />}
      {showGallery && <AppGallery currentUser={currentUser} onClose={() => setShowGallery(false)} />}
      {showAccountSwitch && <AccountSwitchModal currentUser={currentUser} onClose={() => setShowAccountSwitch(false)} />}
      {showStore && <PremiumStore currentUser={currentUser} onClose={() => setShowStore(false)} />}
    </div>
  );
};
