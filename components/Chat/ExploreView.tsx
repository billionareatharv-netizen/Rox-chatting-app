import React, { useState, useEffect, useMemo } from 'react';
import { User, Post } from '../../types';
import { getFeedPosts, getAllUsers } from '../../firebase';

interface ExploreViewProps {
  currentUser: User;
  onOpenProfile: (user: User) => void;
  onOpenPost: (post: Post) => void;
}

const CATEGORIES = ['All', 'Architecture', 'Art', 'Tech', 'Travel', 'Fashion', 'Photography'];

export const ExploreView: React.FC<ExploreViewProps> = ({ currentUser, onOpenProfile, onOpenPost }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [realPosts, setRealPosts] = useState<Post[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    getFeedPosts().then(setRealPosts);
    getAllUsers().then(setAllUsers);
  }, []);

  const searchedUsers = useMemo(() => {
    if (searchTerm.trim().length === 0) return [];
    const term = searchTerm.toLowerCase();
    return allUsers.filter(u => 
        u.name.toLowerCase().includes(term) || 
        u.email.toLowerCase().includes(term) ||
        (u.username && u.username.toLowerCase().includes(term))
    );
  }, [searchTerm, allUsers]);

  const searchedPosts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let results = realPosts;
    
    if (activeCategory !== 'All') {
        // Since we don't have categories in real posts yet, this serves as a placeholder
        // In a real app, you'd filter by post.category
    }

    if (term.length > 0) {
        results = results.filter(p => 
            (p.caption && p.caption.toLowerCase().includes(term)) || 
            p.userName.toLowerCase().includes(term) ||
            (p.location && p.location.toLowerCase().includes(term))
        );
    }
    return results;
  }, [searchTerm, activeCategory, realPosts]);

  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-[#121212] overflow-hidden animate-in fade-in transition-colors duration-300">
        
        {/* Top App Bar */}
        <header className="flex items-center justify-between px-6 pt-6 pb-2 sticky top-0 z-50 bg-background-light/80 dark:bg-[#121212]/80 backdrop-blur-md">
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Explore</h1>
            <div className="flex items-center gap-4">
                <button className="flex items-center justify-center size-10 rounded-full bg-slate-200/50 dark:bg-white/10 hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-slate-900 dark:text-white">notifications</span>
                </button>
                <div 
                    className="size-10 rounded-full bg-cover bg-center border-2 border-primary cursor-pointer shadow-lg shadow-primary/20" 
                    style={{ backgroundImage: `url('${currentUser.photoURL}')` }}
                ></div>
            </div>
        </header>

        {/* Search Bar */}
        <div className="px-6 py-4">
            <label className="relative flex items-center w-full">
                <div className="absolute left-4 text-slate-400 dark:text-slate-500">
                    <span className="material-symbols-outlined">search</span>
                </div>
                <input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-slate-200/50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-slate-500 transition-all font-bold text-sm" 
                    placeholder="Search creators, trends, and art" 
                    type="text"
                />
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 text-slate-400"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                )}
            </label>
        </div>

        {/* Category Chips */}
        <div className="flex gap-3 px-6 py-2 overflow-x-auto no-scrollbar mb-4">
            {CATEGORIES.map(cat => (
                <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex h-11 shrink-0 items-center justify-center gap-x-2 rounded-full px-6 transition-all font-black text-xs uppercase tracking-widest ${activeCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/80 hover:bg-slate-300 dark:hover:bg-white/20'}`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-2 mb-24 no-scrollbar">
            
            {/* User Search Results */}
            {searchTerm && searchedUsers.length > 0 && (
                <section className="mb-6 animate-in slide-in-from-top-4">
                    <h2 className="px-2 mb-4 text-[11px] font-black uppercase text-primary tracking-[0.2em]">Users</h2>
                    <div className="flex flex-col gap-2">
                        {searchedUsers.map(user => (
                            <div 
                                key={user.uid} 
                                onClick={() => onOpenProfile(user)}
                                className="flex items-center gap-4 p-3 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 cursor-pointer active:scale-[0.98] transition-all"
                            >
                                <img src={user.photoURL} className="size-12 rounded-full object-cover border-2 border-primary/20" alt="" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm truncate text-slate-900 dark:text-white">{user.name}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium truncate">@{user.username || user.email.split('@')[0]}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Masonry Grid Layout (Real Posts Only) */}
            {searchedPosts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 auto-rows-[200px]">
                    {searchedPosts.map(post => (
                        <div 
                            key={post.id}
                            onClick={() => onOpenPost(post)}
                            className="relative overflow-hidden rounded-3xl bg-slate-200 dark:bg-slate-800 group cursor-pointer transition-transform active:scale-95 animate-in fade-in zoom-in-95"
                        >
                            {post.mediaType === 'video' ? (
                                <video src={post.mediaUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div 
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                    style={{ backgroundImage: `url("${post.mediaUrl}")` }}
                                ></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                            
                            {post.mediaType === 'video' && (
                                <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md rounded-full p-1.5 z-10 border border-white/10">
                                    <span className="material-symbols-outlined text-[16px] text-white">play_arrow</span>
                                </div>
                            )}

                            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-white overflow-hidden">
                                <img src={post.userPhoto} className="w-6 h-6 rounded-full border border-white/40 shadow-lg shrink-0" alt=""/>
                                <span className="text-[10px] font-black uppercase tracking-widest truncate">{post.userName}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 opacity-40 text-slate-500">
                    <span className="material-symbols-outlined text-7xl mb-4">search_off</span>
                    <p className="font-black uppercase tracking-[0.2em] text-xs">No posts found</p>
                </div>
            )}
        </main>
    </div>
  );
};