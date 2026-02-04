
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../types';
import { toggleFollow, getUserById } from '../../firebase';

interface ConnectionsViewProps {
  targetUser: User;
  currentUser: User;
  initialType: 'followers' | 'following';
  onClose: () => void;
  onOpenProfile: (uid: string) => void;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({ 
  targetUser: initialTargetUser, 
  currentUser, 
  initialType, 
  onClose,
  onOpenProfile
}) => {
  const [type, setType] = useState(initialType);
  const [targetUser, setTargetUser] = useState<User>(initialTargetUser);
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetch target user fresh in case of updates
  useEffect(() => {
    const loadList = async () => {
      setLoading(true);
      const user = await getUserById(initialTargetUser.uid);
      if (user) {
        setTargetUser(user);
        const uids = type === 'followers' ? (user.followers || []) : (user.following || []);
        const users = await Promise.all(uids.map(uid => getUserById(uid)));
        setList(users.filter(u => u !== null) as User[]);
      }
      setLoading(false);
    };
    loadList();
  }, [type, initialTargetUser.uid]);

  const filteredList = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return list;
    return list.filter(u => 
      u.name.toLowerCase().includes(term) || 
      (u.username && u.username.toLowerCase().includes(term))
    );
  }, [search, list]);

  const handleToggleFollow = async (uid: string) => {
    await toggleFollow(currentUser.uid, uid);
    // Locally update UI for better responsiveness
    const isNowFollowing = currentUser.following?.includes(uid);
    // Since this is a global state update, usually we rely on refreshes, 
    // but for connections view we re-fetch effectively via effects above.
    // To make it instant:
    setList(prev => prev.map(u => {
        if(u.uid === uid) {
            const followers = u.followers || [];
            return {
                ...u,
                followers: isNowFollowing ? followers.filter(id => id !== currentUser.uid) : [...followers, currentUser.uid]
            };
        }
        return u;
    }));
  };

  return (
    <div className="fixed inset-0 z-[700] bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex flex-col animate-in slide-in-from-right duration-300">
      {/* iOS Status Bar Placeholder */}
      <div className="h-12 w-full sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl shrink-0">
        <div className="flex justify-between items-center px-6 h-full">
          <span className="text-sm font-semibold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex gap-1.5 items-center">
            <span className="material-symbols-outlined text-[18px]">signal_cellular_4_bar</span>
            <span className="material-symbols-outlined text-[18px]">wifi</span>
            <span className="material-symbols-outlined text-[22px]">battery_full</span>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-12 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 shrink-0">
        <div className="flex items-center px-4 py-3 justify-between">
          <div onClick={onClose} className="flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity">
            <span className="material-symbols-outlined">chevron_left</span>
            <span className="text-sm font-medium">Profile</span>
          </div>
          <h2 className="text-base font-bold tracking-tight truncate max-w-[150px]">
            @{targetUser.username || targetUser.email.split('@')[0]}
          </h2>
          <div className="flex w-8 items-center justify-end">
            <button className="hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
          </div>
        </div>
        
        {/* Tabs Section */}
        <div className="px-4">
          <div className="flex gap-8">
            <button 
                onClick={() => setType('followers')}
                className={`flex flex-col items-center justify-center border-b-[2px] pb-3 pt-2 transition-all ${type === 'followers' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
            >
              <p className="text-sm font-bold tracking-tight">{(targetUser.followers || []).length} Followers</p>
            </button>
            <button 
                onClick={() => setType('following')}
                className={`flex flex-col items-center justify-center border-b-[2px] pb-3 pt-2 transition-all ${type === 'following' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
            >
              <p className="text-sm font-bold tracking-tight">{(targetUser.following || []).length} Following</p>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Search Bar */}
        <div className="px-4 py-4">
          <div className="flex w-full items-center rounded-full h-11 bg-gray-200 dark:bg-white/10 px-4 group focus-within:bg-gray-300 dark:focus-within:bg-white/15 transition-all">
            <span className="material-symbols-outlined text-[20px] text-gray-500 dark:text-gray-400">search</span>
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border-none bg-transparent focus:ring-0 placeholder:text-gray-500 dark:placeholder:text-gray-400 px-3 text-sm font-normal" 
              placeholder={`Search ${type}...`}
            />
          </div>
        </div>

        {/* Followers/Following List */}
        <div className="flex flex-col">
          {loading ? (
            <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-20 opacity-30">
                <span className="material-symbols-outlined text-6xl">person_off</span>
                <p className="text-xs font-black uppercase tracking-widest mt-4">Empty list</p>
            </div>
          ) : (
            filteredList.map((user) => {
              const amFollowing = currentUser.following?.includes(user.uid);
              const isMe = user.uid === currentUser.uid;

              return (
                <div 
                  key={user.uid} 
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => onOpenProfile(user.uid)}
                >
                  <div className="relative shrink-0">
                    <img src={user.photoURL} className="rounded-full h-14 w-14 ring-2 ring-primary/20 object-cover" alt="" />
                    {user.status === 'online' && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background-light dark:border-background-dark rounded-full"></div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-slate-900 dark:text-white text-[15px] font-bold leading-tight truncate">
                        {user.username || user.email.split('@')[0]}
                      </p>
                      {user.isAdmin && (
                        <span className="material-symbols-outlined text-primary text-[14px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      )}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-normal truncate">{user.name}</p>
                  </div>
                  <div className="shrink-0" onClick={e => e.stopPropagation()}>
                    {!isMe && (
                        <button 
                            onClick={() => handleToggleFollow(user.uid)}
                            className={`flex min-w-[96px] h-8 items-center justify-center rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${amFollowing ? 'bg-gray-200 dark:bg-white/10 text-slate-900 dark:text-white border border-transparent dark:border-white/5' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}
                        >
                          {amFollowing ? 'Following' : type === 'followers' ? 'Follow Back' : 'Follow'}
                        </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
