import React, { useState, useEffect, useRef } from 'react';
import { User, Post } from '../../types';
import { blockUser, unblockUser, setNickname, toggleChatLock, updateProfile, saveWallpaper, getPostsByUser, toggleFollow, subscribeToUser, auth } from '../../firebase';

interface PublicProfileProps {
  user: User;
  currentUser: User;
  onClose: () => void;
  onCallStart?: (user: User, type: 'voice' | 'video') => void;
  onMessageClick: (user: User) => void;
  nickname?: string; 
  onOpenPost?: (post: Post) => void;
  onOpenConnections?: (type: 'followers' | 'following') => void;
}

const WALLPAPERS = [
    { id: 'default', color: 'bg-slate-50', label: 'Default' },
    { id: 'indigo', color: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20', label: 'Indigo' },
    { id: 'dark', color: 'bg-slate-900', label: 'Dark' },
    { id: 'sunset', color: 'bg-gradient-to-br from-orange-400/20 to-pink-500/20', label: 'Sunset' },
    { id: 'ocean', color: 'bg-gradient-to-br from-cyan-400/20 to-blue-500/20', label: 'Ocean' },
];

export const PublicProfile: React.FC<PublicProfileProps> = ({ 
    user: initialUser, currentUser, onClose, onCallStart, onMessageClick, nickname: initialNickname, onOpenPost, onOpenConnections 
}) => {
  const [user, setUser] = useState<User>(initialUser);
  const [isBlocked, setIsBlocked] = useState(currentUser?.blockedUsers?.includes(user.uid) || false);
  const [loading, setLoading] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'grid' | 'reels' | 'tagged'>('grid');
  
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(initialNickname || '');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showWallpaperConfirm, setShowWallpaperConfirm] = useState(false);
  const [selectedWallpaper, setSelectedWallpaper] = useState('');

  const chatId = currentUser ? [currentUser.uid, user.uid].sort().join('_') : '';
  const amFollowing = currentUser.following?.includes(user.uid);

  useEffect(() => {
    const unsub = subscribeToUser(initialUser.uid, (updatedData) => {
        if (updatedData) setUser(updatedData as User);
    });
    getPostsByUser(initialUser.uid).then(posts => setUserPosts(posts));
    return () => unsub();
  }, [initialUser.uid]);

  const handleToggleFollow = async () => {
      setLoading(true);
      try {
          await toggleFollow(currentUser.uid, user.uid);
      } catch (e) {
          console.error("Follow action failed", e);
      } finally {
          setLoading(false);
      }
  };

  const handleToggleBlock = async () => {
    setLoading(true);
    try {
      if (isBlocked) {
        await unblockUser(currentUser.uid, user.uid);
        setIsBlocked(false);
      } else {
        if (window.confirm(`Block ${user.name}?`)) {
          await blockUser(currentUser.uid, user.uid);
          setIsBlocked(true);
        }
      }
    } finally {
      setLoading(false);
      setShowOptionsMenu(false);
    }
  };

  const handleSaveNickname = async () => {
    await setNickname(currentUser.uid, user.uid, nicknameInput);
    setIsEditingNickname(false);
    setShowOptionsMenu(false);
  };

  const confirmLock = async () => {
      if(newPin.length < 4) { alert("PIN must be at least 4 chars"); return; }
      await updateProfile(currentUser, { chatLockPassword: newPin });
      await toggleChatLock(chatId, currentUser!.uid);
      setShowPinSetup(false);
      setShowOptionsMenu(false);
      alert("Chat Locked!");
  };

  const confirmWallpaper = async (scope: 'chat' | 'global') => {
      const target = scope === 'chat' ? chatId : 'default';
      await saveWallpaper(currentUser.uid, target, selectedWallpaper);
      setShowWallpaperConfirm(false);
      alert("Wallpaper Applied!");
  };

  return (
    <div className="fixed inset-0 z-[500] bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden h-[100dvh]">
      
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-slate-200 dark:border-white/5">
        <div onClick={onClose} className="flex size-10 shrink-0 items-center justify-start cursor-pointer hover:opacity-60 transition-opacity">
          <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios_new</span>
        </div>
        <h2 className="text-sm font-bold leading-tight tracking-tight flex-1 text-center truncate">@{user.username || user.email.split('@')[0]}</h2>
        <div className="flex w-10 items-center justify-end relative">
          <button onClick={() => setShowOptionsMenu(!showOptionsMenu)} className="flex items-center justify-center rounded-full h-10 w-10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-2xl">more_horiz</span>
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 py-2 z-[510] animate-in zoom-in-95 origin-top-right">
               <button onClick={() => setIsEditingNickname(true)} className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className="material-symbols-outlined text-lg">badge</span> Edit Nickname
               </button>
               <button onClick={() => setShowPinSetup(true)} className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className="material-symbols-outlined text-lg">lock</span> Lock Chat
               </button>
               <button onClick={() => setShowWallpaperModal(true)} className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className="material-symbols-outlined text-lg">wallpaper</span> Set Wallpaper
               </button>
               <div className="h-px bg-slate-100 dark:bg-white/5 my-1"></div>
               <button onClick={handleToggleBlock} className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <span className="material-symbols-outlined text-lg">block</span> {isBlocked ? 'Unblock' : 'Block User'}
               </button>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
        <section className="flex p-6 flex-col items-center">
          <div className="flex w-full flex-col gap-6 items-center">
            <div className="flex gap-4 flex-col items-center">
              <div className="relative p-1 rounded-full bg-gradient-to-tr from-primary to-purple-500 shadow-lg shadow-primary/20">
                <div 
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 border-4 border-background-light dark:border-background-dark" 
                    style={{ backgroundImage: `url("${user.photoURL}")` }}
                ></div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                    <p className="text-[26px] font-black leading-tight tracking-tighter text-center">{user.name}</p>
                    {user.isAdmin && <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed text-center mt-2 max-w-[280px]">
                    {user.bio || "Digital Architect & Visual Storyteller. 🌌"}
                </p>
                <div className="flex items-center gap-1 mt-1 text-slate-400">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">New York, NY</p>
                </div>
              </div>
            </div>

            <div className="flex w-full gap-3 px-4">
              <button 
                onClick={handleToggleFollow}
                disabled={loading}
                className={`flex-1 flex items-center justify-center overflow-hidden rounded-full h-12 text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all ${amFollowing ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white border border-slate-300 dark:border-white/10' : 'bg-gradient-to-tr from-primary to-purple-600 text-white shadow-primary/30'}`}
              >
                {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : amFollowing ? 'Following' : 'Follow'}
              </button>
              <button 
                onClick={() => onMessageClick(user)}
                className="flex-1 flex items-center justify-center overflow-hidden rounded-full h-12 bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest border border-slate-300 dark:border-white/10 active:scale-95 transition-all"
              >
                <span className="truncate">Message</span>
              </button>
            </div>
          </div>
        </section>

        <section className="px-6 mb-6">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1 rounded-[1.5rem] bg-slate-100 dark:bg-white/5 py-4 items-center text-center backdrop-blur-sm border border-transparent dark:border-white/5">
              <p className="text-xl font-black leading-tight">{userPosts.length}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Posts</p>
            </div>
            <div 
                onClick={() => onOpenConnections?.('followers')}
                className="flex flex-1 flex-col gap-1 rounded-[1.5rem] bg-slate-100 dark:bg-white/5 py-4 items-center text-center backdrop-blur-sm border border-transparent dark:border-white/5 cursor-pointer active:bg-slate-200 dark:active:bg-white/10 transition-colors"
            >
              <p className="text-xl font-black leading-tight">{(user.followers || []).length}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Followers</p>
            </div>
            <div 
                onClick={() => onOpenConnections?.('following')}
                className="flex flex-1 flex-col gap-1 rounded-[1.5rem] bg-slate-100 dark:bg-white/5 py-4 items-center text-center backdrop-blur-sm border border-transparent dark:border-white/5 cursor-pointer active:bg-slate-200 dark:active:bg-white/10 transition-colors"
            >
              <p className="text-xl font-black leading-tight">{(user.following || []).length}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Following</p>
            </div>
          </div>
        </section>

        <section className="px-6 mb-8">
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Mutual Friends</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <div className="bg-center bg-no-repeat aspect-square bg-cover border-2 border-background-light dark:border-background-dark bg-slate-800 rounded-full h-9 w-9 relative z-30" style={{ backgroundImage: `url("https://picsum.photos/seed/a1/100")` }}></div>
                <div className="bg-center bg-no-repeat aspect-square bg-cover border-2 border-background-light dark:border-background-dark bg-slate-800 rounded-full h-9 w-9 -ml-3 relative z-20" style={{ backgroundImage: `url("https://picsum.photos/seed/a2/100")` }}></div>
                <div className="bg-center bg-no-repeat aspect-square bg-cover border-2 border-background-light dark:border-background-dark bg-slate-800 rounded-full h-9 w-9 -ml-3 relative z-10" style={{ backgroundImage: `url("https://picsum.photos/seed/a3/100")` }}></div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight">
                Followed by <span className="text-slate-900 dark:text-white font-bold">sarah_j</span> and others
              </p>
            </div>
          </div>
        </section>

        <div className="flex border-b border-slate-200 dark:border-white/5 mb-0.5">
          <button onClick={() => setActiveTab('grid')} className={`flex-1 py-4 flex items-center justify-center transition-all ${activeTab === 'grid' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 opacity-50'}`}>
            <span className="material-symbols-outlined" style={activeTab === 'grid' ? { fontVariationSettings: "'FILL' 1" } : {}}>grid_view</span>
          </button>
          <button onClick={() => setActiveTab('reels')} className={`flex-1 py-4 flex items-center justify-center transition-all ${activeTab === 'reels' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 opacity-50'}`}>
            <span className="material-symbols-outlined">video_library</span>
          </button>
          <button onClick={() => setActiveTab('tagged')} className={`flex-1 py-4 flex items-center justify-center transition-all ${activeTab === 'tagged' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 opacity-50'}`}>
            <span className="material-symbols-outlined">person_pin</span>
          </button>
        </div>

        <section className="grid grid-cols-3 gap-0.5">
            {userPosts.length === 0 ? (
                <div className="col-span-3 py-20 text-center opacity-30">
                    <span className="material-symbols-outlined text-5xl">photo_library</span>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-4">No posts found</p>
                </div>
            ) : (
                userPosts.map(p => (
                    <div key={p.id} onClick={() => onOpenPost?.(p)} className="aspect-square bg-slate-200 dark:bg-white/5 overflow-hidden relative group cursor-pointer active:opacity-70 transition-opacity">
                        {p.mediaType === 'video' ? (
                            <>
                                <video src={p.mediaUrl} className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2"><span className="material-symbols-outlined text-white text-sm">play_circle</span></div>
                            </>
                        ) : (
                            <img src={p.mediaUrl} className="w-full h-full object-cover" alt="" />
                        )}
                    </div>
                ))
            )}
        </section>
      </main>

      {/* PIN Setup Modal */}
      {showPinSetup && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl">
                  <h3 className="text-xl font-black mb-4">Secure this Chat</h3>
                  <p className="text-xs text-slate-500 mb-6 font-bold uppercase tracking-wider">Set a PIN to lock conversations</p>
                  <input 
                    type="password"
                    placeholder="Enter PIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-white/5 p-5 rounded-2xl text-center font-black text-2xl outline-none mb-6 border border-transparent focus:border-primary transition-all"
                    autoFocus
                  />
                  <div className="flex gap-4">
                      <button onClick={() => setShowPinSetup(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs">Cancel</button>
                      <button onClick={confirmLock} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-primary/20">Lock Chat</button>
                  </div>
              </div>
          </div>
      )}

      {/* Wallpaper Picker Modal */}
      {showWallpaperModal && (
          <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black">Chat Wallpaper</h3>
                    <button onClick={() => setShowWallpaperModal(false)}><span className="material-symbols-outlined">close</span></button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                      {WALLPAPERS.map(wp => (
                          <button 
                            key={wp.id} 
                            onClick={() => { setSelectedWallpaper(wp.id); setShowWallpaperModal(false); setShowWallpaperConfirm(true); }}
                            className={`aspect-[9/16] rounded-2xl ${wp.color} border-2 border-transparent hover:border-primary transition-all flex items-center justify-center relative overflow-hidden`}
                          >
                              <span className="text-[10px] font-black uppercase tracking-tighter bg-black/20 text-white px-2 py-1 rounded-md">{wp.label}</span>
                          </button>
                      ))}
                  </div>
                  <button onClick={() => setShowWallpaperModal(false)} className="w-full py-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500">Cancel</button>
              </div>
          </div>
      )}

      {/* Nickname Editor Modal */}
      {isEditingNickname && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl">
                <h3 className="text-xl font-black mb-2">Set Nickname</h3>
                <input 
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="Nickname..."
                  className="w-full bg-slate-100 dark:bg-white/5 p-5 rounded-2xl text-center font-bold text-lg outline-none mb-6 border border-transparent focus:border-primary transition-all"
                  autoFocus
                />
                <div className="flex gap-4">
                    <button onClick={() => setIsEditingNickname(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs">Cancel</button>
                    <button onClick={handleSaveNickname} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-primary/20">Save</button>
                </div>
            </div>
        </div>
      )}

      {showWallpaperConfirm && (
          <div className="fixed inset-0 z-[610] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm text-center">
                  <h3 className="text-xl font-black mb-2">Apply Background</h3>
                  <div className="space-y-4">
                      <button onClick={() => confirmWallpaper('chat')} className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/30 active:scale-95 transition-all">
                          This Chat Only
                      </button>
                      <button onClick={() => confirmWallpaper('global')} className="w-full py-5 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">
                          All Chats
                      </button>
                      <button onClick={() => setShowWallpaperConfirm(false)} className="w-full py-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
