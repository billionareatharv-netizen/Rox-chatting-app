import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, User, Story } from '../../types';
import { toggleLikePost, toggleBookmarkPost, getStories, subscribeToPosts, deletePost, deleteAllPosts } from '../../firebase';

interface HomeFeedProps {
  currentUser: User;
  onOpenDMs: () => void;
  onUploadPost: () => void;
  onOpenStory: (stories: Story[]) => void;
  onOpenPost: (post: Post) => void;
  onOpenAIChat: () => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({ currentUser, onOpenDMs, onUploadPost, onOpenStory, onOpenPost, onOpenAIChat }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAIBubble, setShowAIBubble] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);

  useEffect(() => {
    // Show AI bubble every 10 seconds if not dismissed
    const interval = setInterval(() => {
        if (!bubbleDismissed) {
            setShowAIBubble(true);
            // Auto hide after 5 seconds
            setTimeout(() => setShowAIBubble(false), 5000);
        }
    }, 10000);

    return () => clearInterval(interval);
  }, [bubbleDismissed]);

  useEffect(() => {
    // Subscribe to posts for real-time updates
    const unsubPosts = subscribeToPosts((updatedPosts) => {
        const visiblePosts = updatedPosts.filter(p => !p.isFlagged || p.userId === currentUser.uid);
        setPosts(visiblePosts);
        setLoading(false);
    });

    const loadStories = async () => {
      const activeStories = await getStories();
      const visibleStories = activeStories.filter(s => !s.isFlagged || s.userId === currentUser.uid);
      setStories(visibleStories);
    };
    loadStories();

    return () => unsubPosts();
  }, []);

  const handleLike = async (postId: string) => {
    await toggleLikePost(postId, currentUser.uid);
  };

  const handleBookmark = async (postId: string) => {
    await toggleBookmarkPost(postId, currentUser.uid);
  };

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
    setConfirmDelete(null);
  };

  const handleClearAll = async () => {
    await deleteAllPosts();
    setShowClearConfirm(false);
  };

  // Group stories by user
  const userStoriesMap: Record<string, Story[]> = {};
  stories.forEach(s => {
    if(!userStoriesMap[s.userId]) userStoriesMap[s.userId] = [];
    userStoriesMap[s.userId].push(s);
  });
  const storyUserIds = Object.keys(userStoriesMap);

  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark overflow-hidden animate-in fade-in">
        {/* Top Navigation Bar */}
        <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 header-glass">
            <div className="flex items-center gap-2">
                <div className="bg-primary size-8 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-white text-xl">blur_on</span>
                </div>
                <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-rose-400 dark:from-rose-500 dark:to-rose-300">RED ROX</h1>
            </div>
            <div className="flex items-center gap-4">
                {currentUser.isAdmin && (
                    <button 
                        onClick={() => setShowClearConfirm(true)}
                        className="p-2 rounded-full hover:bg-rose-500/10 text-rose-500 transition-colors"
                        title="Clear All Posts"
                    >
                        <span className="material-symbols-outlined text-2xl">delete_sweep</span>
                    </button>
                )}
                <button 
                    onClick={onOpenDMs}
                    className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-2xl">send</span>
                    <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                </button>
            </div>
        </nav>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
            {/* Stories Carousel */}
            <section className="w-full overflow-x-auto py-6 border-b border-black/5 dark:border-white/5">
                <div className="flex px-4 gap-5 min-w-max">
                    {/* My Story Add */}
                    <div className="flex flex-col items-center gap-2 w-16 group cursor-pointer" onClick={onUploadPost}>
                        <div className="relative w-16 h-16 rounded-full p-[2px] bg-slate-200 dark:bg-slate-800 transition-transform group-hover:scale-105">
                            <img src={currentUser.photoURL} className="w-full h-full rounded-full object-cover border-2 border-background-light dark:border-background-dark" alt="" />
                            <div className="absolute bottom-0 right-0 bg-primary rounded-full border-2 border-background-light dark:border-background-dark p-0.5 flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[14px]">add</span>
                            </div>
                        </div>
                        <p className="text-[11px] font-bold opacity-70">Your Story</p>
                    </div>

                    {/* Active User Stories */}
                    {storyUserIds.map(uid => (
                        <div key={uid} className="flex flex-col items-center gap-2 w-16 cursor-pointer group" onClick={() => onOpenStory(userStoriesMap[uid])}>
                            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-primary via-purple-500 to-pink-500 transition-transform group-hover:scale-105">
                                <img src={userStoriesMap[uid][0].userPhoto} className="w-full h-full rounded-full object-cover border-2 border-background-light dark:border-background-dark" alt="" />
                            </div>
                            <p className="text-[11px] font-bold truncate w-full text-center">{userStoriesMap[uid][0].userName.split(' ')[0]}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Feed List */}
            <main className="flex flex-col gap-6 py-6 max-w-lg mx-auto px-4 sm:px-0">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 opacity-40">
                        <span className="material-symbols-outlined text-6xl">grid_off</span>
                        <p className="font-bold uppercase tracking-widest mt-4">Feed is quiet</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <article key={post.id} className="relative w-full bg-white dark:bg-[#1a1a1a] rounded-[2rem] overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300">
                            {/* Post Header */}
                            <div className="flex items-center justify-between px-5 py-4">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onOpenPost(post)}>
                                    <div className="relative">
                                        <img src={post.userPhoto} className="w-10 h-10 rounded-full border border-black/5 dark:border-white/10 object-cover" alt="" />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#1a1a1a] rounded-full"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold tracking-tight">{post.userName}</span>
                                        <span className="text-[10px] opacity-50 flex items-center gap-1 font-bold uppercase tracking-widest">
                                            {post.location || 'Cyber Space'}
                                        </span>
                                    </div>
                                </div>
                                 <div className="flex items-center gap-1">
                                    {confirmDelete === post.id ? (
                                        <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                                                className="bg-rose-500 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-rose-500/20"
                                            >
                                                Delete
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                                                className="bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest"
                                            >
                                                No
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {post.userId === currentUser.uid && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(post.id); }}
                                                    className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-rose-500/10"
                                                    title="Delete Post"
                                                >
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            )}
                                            <button className="text-slate-400 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                                                <span className="material-symbols-outlined">more_horiz</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Main Media */}
                            <div className="w-full aspect-[4/5] bg-slate-100 dark:bg-[#0f0f0f] overflow-hidden cursor-pointer" onClick={() => onOpenPost(post)}>
                                {post.mediaType === 'video' ? (
                                    <video src={post.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                ) : (
                                    <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
                                )}
                            </div>

                            {/* Interaction Bar */}
                            <div className="px-5 py-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-6">
                                        <button 
                                            onClick={() => handleLike(post.id)}
                                            className={`flex items-center gap-2 transition-all active:scale-125 ${post.likes.includes(currentUser.uid) ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}
                                        >
                                            <span className="material-symbols-outlined text-2xl" style={post.likes.includes(currentUser.uid) ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                                            <span className="text-xs font-bold">{post.likes.length}</span>
                                        </button>
                                        <button 
                                            onClick={() => onOpenPost(post)}
                                            className="flex items-center gap-2 text-slate-900 dark:text-white"
                                        >
                                            <span className="material-symbols-outlined text-2xl">chat_bubble</span>
                                            <span className="text-xs font-bold">{post.commentCount}</span>
                                        </button>
                                        <button className="text-slate-900 dark:text-white hover:text-primary transition-colors">
                                            <span className="material-symbols-outlined text-2xl">send</span>
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => handleBookmark(post.id)}
                                        className={`transition-all active:scale-125 ${post.bookmarks.includes(currentUser.uid) ? 'text-primary' : 'text-slate-900 dark:text-white'}`}
                                    >
                                        <span className="material-symbols-outlined text-2xl" style={post.bookmarks.includes(currentUser.uid) ? { fontVariationSettings: "'FILL' 1" } : {}}>bookmark</span>
                                    </button>
                                </div>
                                <div className="text-sm leading-relaxed">
                                    <span className="font-bold mr-2">@{post.userName.toLowerCase().replace(/\s/g, '_')}</span> 
                                    <span className="font-medium opacity-80">{post.caption}</span>
                                    {post.caption && post.caption.length > 60 && (
                                        <button onClick={() => onOpenPost(post)} className="ml-1 text-primary font-bold">...more</button>
                                    )}
                                </div>
                                <button onClick={() => onOpenPost(post)} className="mt-3 text-[11px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                                    View all {post.commentCount} comments
                                </button>
                            </div>
                        </article>
                    ))
                )}
            </main>
        </div>

        {/* Clear All Confirmation Modal */}
        {showClearConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-card-dark w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-black/5 dark:border-white/5 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl">delete_forever</span>
                    </div>
                    <h3 className="text-xl font-black text-center mb-2 tracking-tight">Clear All Posts?</h3>
                    <p className="text-sm text-center text-slate-500 dark:text-[#a19cba] mb-8 font-medium">
                        This will permanently delete every post from the feed. This action cannot be undone.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleClearAll}
                            className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
                        >
                            Yes, Clear Everything
                        </button>
                        <button 
                            onClick={() => setShowClearConfirm(false)}
                            className="w-full bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white font-black py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-xs"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Floating AI Bubble */}
        <AnimatePresence>
            {showAIBubble && (
                <motion.div 
                    initial={{ opacity: 0, x: 50, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 50, scale: 0.8 }}
                    className="fixed right-6 bottom-48 z-[90] flex items-center gap-3"
                >
                    <div 
                        onClick={onOpenAIChat}
                        className="bg-rose-500 text-white px-4 py-3 rounded-2xl rounded-br-none shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all border border-white/20 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-xl animate-bounce">smart_toy</span>
                        <span className="text-xs font-black uppercase tracking-tight">Chat with Roxx AI 🤖</span>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowAIBubble(false); setBubbleDismissed(true); }}
                        className="size-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};
