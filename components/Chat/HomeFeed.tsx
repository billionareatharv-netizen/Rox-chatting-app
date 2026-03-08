import React, { useState, useEffect } from 'react';
import { Post, User, Story } from '../../types';
import { toggleLikePost, toggleBookmarkPost, getStories, subscribeToPosts, deletePost } from '../../firebase';

interface HomeFeedProps {
  currentUser: User;
  onOpenDMs: () => void;
  onUploadPost: () => void;
  onOpenStory: (stories: Story[]) => void;
  onOpenPost: (post: Post) => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({ currentUser, onOpenDMs, onUploadPost, onOpenStory, onOpenPost }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to posts for real-time updates
    const unsubPosts = subscribeToPosts((updatedPosts) => {
        setPosts(updatedPosts);
        setLoading(false);
    });

    const loadStories = async () => {
      const activeStories = await getStories();
      setStories(activeStories);
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
    if (window.confirm('Delete this post?')) {
      await deletePost(postId);
    }
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
                <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">ROXX SOCIAL</h1>
            </div>
            <div className="flex items-center gap-4">
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
            <main className="flex flex-col gap-10 py-8 max-w-lg mx-auto">
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
                        <article key={post.id} className="relative w-full animate-in slide-in-from-bottom-10 duration-500">
                            {/* Post Header */}
                            <div className="flex items-center justify-between px-4 mb-3">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onOpenPost(post)}>
                                    <div className="relative">
                                        <img src={post.userPhoto} className="w-10 h-10 rounded-full border border-black/5 dark:border-white/10 object-cover" alt="" />
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-background-dark rounded-full"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black tracking-tight">{post.userName}</span>
                                        <span className="text-[10px] opacity-50 flex items-center gap-1 font-bold uppercase tracking-widest">
                                            {post.location || 'Cyber Space'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {post.userId === currentUser.uid && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                                            className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-rose-500/10"
                                            title="Delete Post"
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    )}
                                    <button className="text-slate-400 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                                        <span className="material-symbols-outlined">more_horiz</span>
                                    </button>
                                </div>
                            </div>

                            {/* Main Media */}
                            <div className="w-full aspect-[4/5] bg-slate-100 dark:bg-card-dark overflow-hidden cursor-pointer sm:rounded-3xl border border-black/5 dark:border-white/5 shadow-xl" onClick={() => onOpenPost(post)}>
                                {post.mediaType === 'video' ? (
                                    <video src={post.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                ) : (
                                    <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
                                )}
                            </div>

                            {/* Interaction Bar */}
                            <div className="px-4 mt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-5">
                                        <button 
                                            onClick={() => handleLike(post.id)}
                                            className={`flex items-center gap-1.5 transition-all active:scale-125 ${post.likes.includes(currentUser.uid) ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}
                                        >
                                            <span className="material-symbols-outlined text-2xl" style={post.likes.includes(currentUser.uid) ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                                            <span className="text-xs font-black">{post.likes.length}</span>
                                        </button>
                                        <button 
                                            onClick={() => onOpenPost(post)}
                                            className="flex items-center gap-1.5 text-slate-900 dark:text-white"
                                        >
                                            <span className="material-symbols-outlined text-2xl">chat_bubble</span>
                                            <span className="text-xs font-black">{post.commentCount}</span>
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
                                    <span className="font-black mr-2">@{post.userName.toLowerCase().replace(/\s/g, '_')}</span> 
                                    <span className="font-medium opacity-90">{post.caption}</span>
                                    {post.caption && post.caption.length > 60 && (
                                        <button onClick={() => onOpenPost(post)} className="ml-1 text-primary font-bold">...more</button>
                                    )}
                                </div>
                                <button onClick={() => onOpenPost(post)} className="mt-2 text-[11px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                                    View all {post.commentCount} comments
                                </button>
                            </div>
                        </article>
                    ))
                )}
            </main>
        </div>
    </div>
  );
};
