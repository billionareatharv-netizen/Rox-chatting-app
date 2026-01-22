import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Chat } from '../../types';
import { getAllUsers, getMyChats, togglePinChat, subscribeToUser } from '../../firebase';
import { CreateGroupModal } from './CreateGroupModal';
import { AppGallery } from './AppGallery';
import { AccountSwitchModal } from './AccountSwitchModal';

interface SidebarProps {
  currentUser: User;
  onChatSelect: (chat: Chat) => void;
  activeChatId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, onChatSelect, activeChatId
}) => {
  const [search, setSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  
  // Menu States
  const [showMenu, setShowMenu] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showAccountSwitch, setShowAccountSwitch] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    // Sync pinned chats from user profile real-time
    const unsub = subscribeToUser(currentUser.uid, (data) => {
        setPinnedChats(data.pinnedChats || []);
    });

    const sync = async () => {
      const users = await getAllUsers();
      const myBlocked = currentUser.blockedUsers || [];
      setAllUsers(users.filter(u => u.uid !== currentUser.uid && !myBlocked.includes(u.uid)));
      const myChats = await getMyChats(currentUser.uid);
      setChats(myChats);
    };
    sync();
    const itv = setInterval(sync, 2000);
    return () => {
        clearInterval(itv);
        unsub();
    };
  }, [currentUser]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
        searchInputRef.current.focus();
    }
    if (!isSearchOpen) {
        setSearch('');
    }
  }, [isSearchOpen]);

  const isRevealingLocked = currentUser.chatLockPassword && search === currentUser.chatLockPassword;

  const isUserOnline = (u: User | undefined) => {
    if (!u) return false;
    // Check if I am blocked by them (simple client side check for UI, real security is backend)
    // Actually, we don't have their blocked list here easily without fetching.
    // Assuming standard privacy:
    if (u.privacySettings?.lastSeen === 'nobody') return false;
    
    if (u.status !== 'online') return false;
    const timeDiff = Date.now() - (u.lastSeen || 0);
    return timeDiff < 3 * 60 * 1000;
  };

  const handlePinChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    await togglePinChat(currentUser.uid, chatId);
  };

  const handleSwitchAccountClick = () => {
    setShowMenu(false);
    setShowAccountSwitch(true);
  };

  const searchResults = useMemo(() => {
    const term = search.toLowerCase().trim();
    
    let visibleChats = chats.filter(c => {
      const isLocked = c.lockedBy?.includes(currentUser.uid);
      if (isRevealingLocked) return isLocked; 
      return !isLocked;
    });

    // SORTING LOGIC: Pinned first, then recent
    visibleChats.sort((a, b) => {
        const isAPinned = pinnedChats.includes(a.id);
        const isBPinned = pinnedChats.includes(b.id);
        if (isAPinned && !isBPinned) return -1;
        if (!isAPinned && isBPinned) return 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
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
  }, [search, allUsers, chats, currentUser.uid, isRevealingLocked, pinnedChats]);

  const handleStartNewChat = (user: User) => {
    const existing = chats.find(c => c.type === 'private' && c.participants.includes(user.uid));
    if (existing) onChatSelect(existing);
    else onChatSelect({
      id: [currentUser.uid, user.uid].sort().join('_'),
      type: 'private', participants: [currentUser.uid, user.uid],
      updatedAt: Date.now(), lockedBy: []
    });
    setSearch('');
    setIsSearchOpen(false);
  };

  const getChatInfo = (chat: Chat) => {
    if (chat.type === 'group') return { name: chat.name || 'Group', photo: chat.groupIcon || `https://picsum.photos/seed/${chat.id}/200` };
    const otherId = chat.participants.find(p => p !== currentUser.uid);
    const user = allUsers.find(u => u.uid === otherId);
    
    // Privacy Check for Blocked Users (If I am blocked by them, I shouldn't see their PFP ideally, but let's keep it simple for listing)
    return { name: user?.name || 'Contact', photo: user?.photoURL || `https://picsum.photos/seed/${otherId}/200`, status: user?.status, userObj: user };
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 animate-in slide-in-from-left duration-300 relative border-r border-slate-100 dark:border-slate-800">
      
      {/* Professional Header */}
      <div className="h-20 px-5 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 sticky top-0">
        {isSearchOpen ? (
            <div className="flex-1 flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl animate-in fade-in zoom-in-95">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="Search messages..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400"
                />
                <button onClick={() => setIsSearchOpen(false)} className="p-1 bg-slate-200 dark:bg-slate-700 rounded-full">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        ) : (
            <>
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Messages</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{chats.length} active chats</p>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsSearchOpen(true)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setShowMenu(!showMenu)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                        </button>
                        {/* 3-Dot Menu Dropdown */}
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden animate-in zoom-in-95 origin-top-right z-50">
                                <button 
                                    onClick={() => { setShowGroupModal(true); setShowMenu(false); }}
                                    className="w-full px-5 py-3.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                >
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    Create Group
                                </button>
                                <button 
                                    onClick={() => { setShowGallery(true); setShowMenu(false); }}
                                    className="w-full px-5 py-3.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                >
                                    <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Gallery
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4 my-1"></div>
                                <button 
                                    onClick={handleSwitchAccountClick}
                                    className="w-full px-5 py-3.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                >
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                    Switch Account
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 px-3 pb-24 no-scrollbar pt-2">
        {isRevealingLocked && (
          <div className="mx-2 px-4 py-3 bg-indigo-500/10 rounded-xl mb-4 border border-indigo-500/20 text-center animate-in fade-in slide-in-from-top-2">
             <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.25em]">Hidden Chats Visible</span>
          </div>
        )}
        
        {searchResults.chats.length === 0 && searchResults.users.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6 opacity-60">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No chats yet.</p>
            <button onClick={() => setShowGroupModal(true)} className="mt-4 text-indigo-500 font-bold text-xs uppercase tracking-wider hover:underline">Start Conversation</button>
          </div>
        )}

        {searchResults.chats.map(chat => {
          const info = getChatInfo(chat);
          const isActive = activeChatId === chat.id;
          const isOnline = chat.type === 'private' && isUserOnline(info.userObj);
          const isPinned = pinnedChats.includes(chat.id);

          return (
            <div 
              key={chat.id} onClick={() => { onChatSelect(chat); if(isRevealingLocked) setSearch(''); }}
              className={`relative flex items-center gap-4 p-3.5 rounded-[1.2rem] cursor-pointer transition-all active:scale-[0.98] group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 bg-transparent'}`}
            >
              <div className="relative flex-shrink-0">
                <img src={info.photo} className={`w-12 h-12 rounded-full object-cover shadow-sm ${isActive ? 'ring-2 ring-white/20' : 'ring-1 ring-slate-100 dark:ring-slate-700'}`} alt="" />
                {isOnline && !isActive && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h4 className={`font-bold text-[15px] truncate flex items-center gap-1.5 ${isActive ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                      {info.name}
                      {isPinned && <svg className={`w-3 h-3 ${isActive ? 'text-white/80' : 'text-indigo-500'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z"/></svg>}
                  </h4>
                  <span className={`text-[10px] font-bold ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                    {chat.lastMessage ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[13px] truncate font-medium leading-relaxed ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                    {chat.lastMessage?.text || 'Start chatting...'}
                  </p>
                  {chat.lockedBy?.includes(currentUser.uid) && !isActive && (
                    <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6-5c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3z"/></svg>
                  )}
                </div>
              </div>
              {/* Pin Button */}
              <button 
                onClick={(e) => handlePinChat(e, chat.id)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all ${isActive ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white dark:bg-slate-700 shadow-md text-slate-400 hover:text-indigo-500'}`}
              >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z"/></svg>
              </button>
            </div>
          );
        })}

        {searchResults.users.map(u => {
          const isOnline = isUserOnline(u);
          return (
            <div key={u.uid} onClick={() => handleStartNewChat(u)} className="flex items-center gap-4 p-3.5 rounded-[1.2rem] cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-800/60 transition-all group">
              <div className="relative">
                <img src={u.photoURL} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="" />
                {isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[15px] truncate text-slate-800 dark:text-slate-100">{u.name}</h4>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${isOnline ? 'text-green-500' : 'text-slate-400'}`}>
                    {isOnline ? 'Online Now' : 'Offline'}
                </p>
              </div>
              <div className="p-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 bg-indigo-50 dark:bg-slate-700 rounded-full text-indigo-500">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          );
        })}
      </div>

      {showGroupModal && <CreateGroupModal currentUser={currentUser} onClose={() => setShowGroupModal(false)} onCreated={onChatSelect} />}
      {showGallery && <AppGallery currentUser={currentUser} onClose={() => setShowGallery(false)} />}
      {showAccountSwitch && <AccountSwitchModal currentUser={currentUser} onClose={() => setShowAccountSwitch(false)} />}
    </div>
  );
};
