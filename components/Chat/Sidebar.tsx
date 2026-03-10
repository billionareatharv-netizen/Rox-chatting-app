import React, { useState, useMemo, useEffect } from 'react';
import { User, Chat, Note } from '../../types';
import { getAllUsers, getMyChats, subscribeToNotes } from '../../firebase';
import { CreateGroupModal } from './CreateGroupModal';
import { AppGallery } from './AppGallery';
import { AccountSwitchModal } from './AccountSwitchModal';
import { CreateNoteModal } from './CreateNoteModal';

interface SidebarProps {
  currentUser: User;
  onChatSelect: (chat: Chat) => void;
  onOpenAIChat: () => void;
  activeChatId?: string;
  nicknames: Record<string, string>; 
  onBack?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, onChatSelect, onOpenAIChat, activeChatId, nicknames, onBack
}) => {
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showAccountSwitch, setShowAccountSwitch] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
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
    const itv = setInterval(fetchData, 10000);
    const unsubNotes = subscribeToNotes(setNotes);
    
    return () => {
        clearInterval(itv);
        unsubNotes();
    };
  }, [currentUser.uid]);

  const activeUsers = useMemo(() => {
    return allUsers.filter(u => u.status === 'online');
  }, [allUsers]);

  const searchResults = useMemo(() => {
    const term = search.toLowerCase().trim();
    let visibleChats = chats.filter(c => !c.lockedBy?.includes(currentUser.uid));
    
    visibleChats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (!term) return visibleChats;
    return visibleChats.filter(c => {
      const otherId = c.participants.find(p => p !== currentUser.uid);
      const otherUser = allUsers.find(u => u.uid === otherId);
      const name = c.type === 'group' ? c.name : (nicknames[otherId!] || otherUser?.name || 'User');
      return name?.toLowerCase().includes(term);
    });
  }, [search, allUsers, chats, currentUser.uid, nicknames]);

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

  const getTimeLabel = (timestamp?: number) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const myNote = notes.find(n => n.userId === currentUser.uid);

  return (
    <div className="w-full h-full flex flex-col bg-background-light dark:bg-background-dark animate-in fade-in duration-300 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-10 dark:opacity-20 pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] bg-primary/20 blur-[80px] rounded-full"></div>
      </div>
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-6 pt-8 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-900 dark:text-white active:scale-90 transition-transform hover:bg-black/5 dark:hover:bg-white/5 rounded-full">
                    <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
                </button>
                <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">Inbox</h1>
            </div>
            <div className="flex gap-3">
                <button className="size-11 flex items-center justify-center rounded-2xl bg-slate-200/50 dark:bg-white/5 text-slate-900 dark:text-white active:scale-95 transition-all border border-transparent dark:border-white/5">
                    <span className="material-symbols-outlined text-[22px]">video_call</span>
                </button>
                <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className={`size-11 flex items-center justify-center rounded-2xl transition-all border border-transparent dark:border-white/5 ${showMenu ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-200/50 dark:bg-white/5 text-slate-900 dark:text-white'}`}
                >
                    <span className="material-symbols-outlined text-[22px]">edit_square</span>
                </button>
            </div>
        </div>

        {/* Glassmorphism Search Bar */}
        <div className="mb-2">
            <div className="relative flex items-center w-full h-14 rounded-3xl bg-slate-200/50 dark:bg-[#2b2839]/60 backdrop-blur-xl border border-transparent dark:border-white/5 px-5 shadow-inner">
                <span className="material-symbols-outlined text-[#a19cba] mr-3">search</span>
                <input 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent border-none text-slate-900 dark:text-white focus:ring-0 placeholder:text-[#a19cba]/60 text-sm font-bold" 
                    placeholder="Search conversations..."
                />
            </div>
        </div>
      </header>

      {/* Menu Popover */}
      {showMenu && (
          <div className="absolute right-6 top-20 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-2 z-[60] w-52 border border-gray-100 dark:border-white/10 animate-in zoom-in-95">
              <button onClick={()=>{setShowGallery(true); setShowMenu(false)}} className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">photo_library</span> Gallery
              </button>
              <button onClick={()=>{setShowAccountSwitch(true); setShowMenu(false)}} className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">sync_alt</span> Switch Account
              </button>
          </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* Notes & Active Now Section */}
        {!search && (
            <section className="mb-6">
                <div className="flex items-center justify-between px-4 pb-3">
                    <h3 className="text-slate-500 dark:text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Notes & Activity</h3>
                    <span className="text-primary text-[10px] font-black uppercase tracking-widest cursor-pointer">See All</span>
                </div>
                
                <div className="flex w-full overflow-x-auto px-4 gap-6 no-scrollbar scroll-smooth pt-12 pb-4">
                    {/* Roxx AI Note */}
                    <div className="flex flex-col items-center gap-3 shrink-0 relative">
                        <div className="relative group cursor-pointer" onClick={onOpenAIChat}>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 to-rose-600 px-3 py-1.5 rounded-xl shadow-xl border border-white/10 z-20 min-w-[80px]">
                                <p className="text-[10px] font-black text-center leading-tight text-white uppercase tracking-tighter">
                                    ROXX AI 🤖
                                </p>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-rose-600 rotate-45 border-r border-b border-white/10"></div>
                            </div>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 p-1 shadow-lg group-hover:scale-105 transition-transform">
                                <div className="w-full h-full rounded-full bg-background-light dark:bg-background-dark flex items-center justify-center">
                                    <span className="material-symbols-outlined text-rose-500 text-3xl animate-pulse">smart_toy</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-rose-500 text-[10px] font-black uppercase tracking-tight">ROXX AI</p>
                    </div>

                    {/* My Note / Profile First */}
                    <div className="flex flex-col items-center gap-3 shrink-0 relative">
                        <div className="relative group cursor-pointer" onClick={() => setShowNoteModal(true)}>
                            {/* Thought Bubble for Me */}
                            {myNote && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1d1b27] px-3 py-1.5 rounded-xl shadow-xl border border-white/10 z-20 min-w-[50px] max-w-[100px]">
                                    <p className="text-[10px] font-bold text-center leading-tight line-clamp-2 text-slate-800 dark:text-white">
                                        {myNote.text}
                                    </p>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-[#1d1b27] rotate-45 border-r border-b border-white/10"></div>
                                </div>
                            )}
                            
                            <img src={currentUser.photoURL} className={`w-16 h-16 rounded-full object-cover border-2 transition-transform group-hover:scale-105 ${myNote ? 'border-primary shadow-lg' : 'border-slate-200 dark:border-slate-800'}`} alt="" />
                            
                            {!myNote && (
                                <div className="absolute -bottom-1 -right-1 bg-primary text-white size-6 rounded-full flex items-center justify-center border-4 border-background-light dark:border-background-dark shadow-md scale-90">
                                    <span className="material-symbols-outlined text-[14px] font-black">add</span>
                                </div>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-white/60 text-[10px] font-black uppercase tracking-tight">Your Note</p>
                    </div>

                    {/* Active Friends & Their Notes */}
                    {activeUsers.map(user => {
                        const friendNote = notes.find(n => n.userId === user.uid);
                        return (
                            <div key={user.uid} className="flex flex-col items-center gap-3 relative shrink-0 group cursor-pointer" onClick={() => onChatSelect({ id: [currentUser.uid, user.uid].sort().join('_'), type: 'private', participants: [currentUser.uid, user.uid], updatedAt: Date.now() })}>
                                <div className="relative">
                                    {/* Friend's Thought Bubble */}
                                    {friendNote && (
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1d1b27] px-3 py-1.5 rounded-xl shadow-xl border border-white/10 z-20 min-w-[50px] max-w-[100px] animate-in slide-in-from-bottom-2">
                                            <p className="text-[10px] font-bold text-center leading-tight line-clamp-2 text-slate-800 dark:text-white">
                                                {friendNote.text}
                                            </p>
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-[#1d1b27] rotate-45 border-r border-b border-white/10"></div>
                                        </div>
                                    )}

                                    <div className="w-16 h-16 rounded-full border-2 border-primary p-0.5 transition-transform group-hover:scale-105">
                                        <img src={user.photoURL} className="w-full h-full rounded-full object-cover" alt="" />
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-green-500 border-[3px] border-background-light dark:border-background-dark rounded-full"></div>
                                </div>
                                <p className="text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-tight truncate w-16 text-center">{user.name.split(' ')[0]}</p>
                            </div>
                        );
                    })}
                </div>
            </section>
        )}

        {/* Message List */}
        <main className="flex-1 px-2 space-y-1">
            {loading ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : searchResults.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                    <span className="material-symbols-outlined text-5xl">chat_bubble</span>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-2">No conversations found</p>
                </div>
            ) : (
                searchResults.map(chat => {
                    const info = getChatInfo(chat);
                    const isActive = activeChatId === chat.id;
                    const isUnread = chat.lastMessage && chat.lastMessage.senderId !== currentUser.uid; // Simple logic
                    
                    return (
                        <div 
                            key={chat.id} 
                            onClick={() => onChatSelect(chat)} 
                            className={`flex items-center gap-4 px-4 py-4 rounded-3xl group cursor-pointer transition-all active:scale-[0.98] ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : isUnread ? 'bg-indigo-500/5 dark:bg-[#330df2]/10 border-l-4 border-primary' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                        >
                            <div className="relative shrink-0">
                                <img src={info.photo} className={`w-14 h-14 rounded-full object-cover border-2 ${isActive ? 'border-white/30' : 'border-transparent'}`} alt="" />
                                {info.userObj?.status === 'online' && !isActive && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background-light dark:border-background-dark"></div>
                                )}
                                {isUnread && !isActive && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background-light dark:border-background-dark shadow-md"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h4 className={`text-sm font-black truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{info.name}</h4>
                                    <span className={`text-[10px] font-bold ${isActive ? 'text-white/70' : isUnread ? 'text-primary' : 'text-slate-400'}`}>
                                        {getTimeLabel(chat.lastMessage?.timestamp)}
                                    </span>
                                </div>
                                <p className={`text-[13px] line-clamp-1 font-medium ${isActive ? 'text-white/80' : isUnread ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-[#a19cba]'}`}>
                                    {chat.lastMessage?.text || 'Start a new conversation'}
                                </p>
                            </div>
                        </div>
                    );
                })
            )}
        </main>
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowGroupModal(true)}
        className="fixed bottom-28 right-6 w-16 h-16 bg-primary rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-[100]"
      >
        <span className="material-symbols-outlined text-white text-3xl font-bold">add_comment</span>
      </button>

      {showGroupModal && <CreateGroupModal currentUser={currentUser} onClose={() => setShowGroupModal(false)} onCreated={onChatSelect} />}
      {showGallery && <AppGallery currentUser={currentUser} onClose={() => setShowGallery(false)} />}
      {showAccountSwitch && <AccountSwitchModal currentUser={currentUser} onClose={() => setShowAccountSwitch(false)} />}
      {showNoteModal && <CreateNoteModal currentUser={currentUser} onClose={() => setShowNoteModal(false)} />}
    </div>
  );
};