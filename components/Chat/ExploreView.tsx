
import React, { useState, useEffect, useMemo } from 'react';
import { User, Post } from '../../types';
import { getFeedPosts, getAllUsers } from '../../firebase';

interface ExploreViewProps {
  currentUser: User;
  onOpenProfile: (user: User) => void;
}

interface DiscoveryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  category: string;
  title: string;
  likes: string;
  views?: string;
  isLarge?: boolean;
}

const DISCOVERY_MOCK: DiscoveryItem[] = [
    { id: 'd1', type: 'image', category: 'Architecture', title: 'Neon Brutalism in Neo-Tokyo', likes: '12.4k', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmgcvjz3eli7elfnKZtO1wx23xMVm5M4q9XoR9RzMGnkSpxQeds5h-4oMlyOsw44llnWpIy0hfCdRoRdKEVeI5zc6RV6EJHARIAC_g0iEZ4Djt0D0CKxWoSgzfseufPqy2rB8lNdtcAKeGhxq64n254rB0e2T8UrqlBk1Jgb8RwqPi6TrZ6061YoX33j4teU_21gsNRDaaPLTqUHBdpKhRJE_QOdZQ_VgPHbkkhBkuz8nMtImmTaHFdvg7bxuvtp-SLTcTFHQL', isLarge: true },
    { id: 'd2', type: 'image', category: 'Architecture', title: 'Spiral Staircase', likes: '3.2k', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU3u7LF317yDypbNYN6gi5IrdffxqLTQImfCivU4Lyd_o1A3viw4ZKk0pg5ByfQzsytwsB5X5dttB9_-1icmalsQR8hXjMrUyuG-ohXgVBqxQSjHCKzOByMF-P4_2UiX9rkndDHBTo4NOw5z6KdESa6WwMevp4qhtXNa5Ws_ZKx8hkvf7MRCaH5ASj8gbUtB6lqluHBWOpNpF_rd0VtzxpGLCqkwXDh_5XvKiKZQVk7QlaVv54UfZXRNEINkZGvOBVuapwKJxl' },
    { id: 'd3', type: 'video', category: 'Art', title: 'Fluid Motion', likes: '891', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC39v11O2PDtUiOOf9V3J6M1ld3b1sIEL94UF1gL3JGsol9TL4raYbdAilQJ0Jd0BBU90RIT9XGNcFU_PzI_9QX9hbH0bh5Dq0sDnZpavG9jhelon_cXZPvoZ9JQmnNjEhikstWmM7gd_Ji8sYC023WZn4w70tkkfYLhf1JXTQub8hqqEOSJYgD3FA82SRm0cBPjSnGqH0MCrr9E49m7k-NIquscooevjAWPSBQKxoVzPlKT8CzmbCwnsmFFX4vmrx-UQ9IaI2G' },
    { id: 'd4', type: 'image', category: 'Tech', title: 'Workstation Setup', likes: '4.5k', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2p7rvhyWbSSrgRc2cKle-xiRtIe88Xg3Nx_PatzP82xQynYRq9PHwqnCAaowWWL7_gxYLbvL2fK_idXLheifI7yZc2uqdXyKfe64zLJTayA5vdYwyt0C_xdDqI8GEQZ18SvMpTAHy0llaYEDhSSXfOT9qSpGQb11Ta_bECA99kJvpbRZKCJ0nUtTeJV-3nZvcFhCJlHuLuEGV3AHF5IOEpzmP_PIS9ud4--o8B92SW264r-qJMk5eIe_3nW_yCl4aajWn87V_' },
    { id: 'd5', type: 'image', category: 'Travel', title: 'Hidden Lagoons of Palawan', likes: '22.1k', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAC32490wxlk0bR_dxdeFY1dzQI8TcLi4RCiKdyjK_uBIa-xwY_cz9Rdwh-QPbQyRXbE32aAJHGe-_K5OhMCyocDSqUUOFbY4rMv_KkNlIu7-76EywA5d7GVQVVyg0EOZJxTre02L5YbW9MEYGvpq1SVHPRyl5jn6hT5d3qhAO9BFRrT5gX1IXtaVnOMgDFmGPM4OaWe-xOx5RJcBr4kJj3EvqwRt9s6C76ZWA8kgmxibiM7WjJ3WLRgCVo3bmrBI38TDktPJFN', isLarge: true },
    { id: 'd6', type: 'image', category: 'Fashion', title: 'Minimalist Watch', likes: '1.2k', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADnR8RVB9pUgs0hwQZSLhUjCONnE5MRO1gf-U07cbAWEoo6d7bPtnrDEHylv-OguHC20OnvZ6wjlmIXPtUQtVJJpazki-_n4wkdNvD8CHVfCJZpPVt20IOElY-dHOlLLB5VqhkItqpWrEg3kcLkJ_JftgwFQza2fHHPIznehyuWCcA_IaLQklpazQlTuKxgJ32Zl_JOPUDmp2m1xo09KDrfzTceXDn5i4zJ5pV7_jMvi9Y8Rto_s3J94DQG0Ef4b0g5G9najID' }
];

const CATEGORIES = ['All', 'Architecture', 'Travel', 'Art', 'Tech', 'Fashion', 'Cuisine'];

export const ExploreView: React.FC<ExploreViewProps> = ({ currentUser, onOpenProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [realPosts, setRealPosts] = useState<Post[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    getFeedPosts().then(setRealPosts);
    getAllUsers().then(setAllUsers);
  }, []);

  const filteredDiscovery = useMemo(() => {
    return DISCOVERY_MOCK.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             item.category.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && (searchTerm === '' || matchesSearch);
    });
  }, [activeCategory, searchTerm]);

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
    if (searchTerm.trim().length === 0) return realPosts;
    const term = searchTerm.toLowerCase();
    return realPosts.filter(p => 
        (p.caption && p.caption.toLowerCase().includes(term)) || 
        p.userName.toLowerCase().includes(term) ||
        (p.location && p.location.toLowerCase().includes(term))
    );
  }, [searchTerm, realPosts]);

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
                    className="w-full h-14 pl-12 pr-4 bg-slate-200/50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all font-bold text-sm" 
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

        {/* Category Chips - Hide when searching for users */}
        {!searchTerm && (
            <div className="flex gap-3 px-6 py-2 overflow-x-auto no-scrollbar">
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
        )}

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

            {/* Masonry Grid Layout */}
            <div className="grid grid-cols-2 gap-3 auto-rows-[160px]">
                {filteredDiscovery.map(item => (
                    <div 
                        key={item.id}
                        className={`relative overflow-hidden rounded-3xl bg-slate-800 group cursor-pointer transition-transform active:scale-95 ${item.isLarge ? 'row-span-2' : ''}`}
                    >
                        {/* Background Layer */}
                        <div 
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                            style={{ backgroundImage: `url("${item.url}")` }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                        {/* Video Icon */}
                        {item.type === 'video' && (
                            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-full p-2 z-10 border border-white/10">
                                <span className="material-symbols-outlined text-[18px] text-white">play_arrow</span>
                            </div>
                        )}

                        {/* Text Overlay */}
                        <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-1 pointer-events-none">
                            {item.isLarge && (
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-1">Featured</span>
                            )}
                            <h3 className={`font-black text-white leading-tight line-clamp-2 ${item.isLarge ? 'text-lg tracking-tight' : 'text-xs'}`}>{item.title}</h3>
                            <div className="flex items-center gap-2 mt-1 opacity-80 text-white">
                                <span className="material-symbols-outlined text-[14px]">favorite</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">{item.likes}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Real User Posts Integration */}
                {searchedPosts.map(post => (
                    <div 
                        key={post.id}
                        className="relative overflow-hidden rounded-3xl bg-slate-800 group cursor-pointer transition-transform active:scale-95 animate-in fade-in zoom-in-95"
                    >
                        <div 
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url("${post.mediaUrl}")` }}
                        ></div>
                        <div className="absolute inset-0 bg-black/40"></div>
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                            <img src={post.userPhoto} className="w-5 h-5 rounded-full border border-white/40 shadow-lg" alt=""/>
                            <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[80px]">{post.userName}</span>
                        </div>
                    </div>
                ))}
            </div>

            {searchedPosts.length === 0 && filteredDiscovery.length === 0 && searchedUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 opacity-40 text-slate-500">
                    <span className="material-symbols-outlined text-7xl mb-4">search_off</span>
                    <p className="font-black uppercase tracking-[0.2em] text-xs">No matches found</p>
                </div>
            )}
        </main>
    </div>
  );
};
