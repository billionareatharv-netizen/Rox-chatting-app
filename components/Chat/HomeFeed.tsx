
import React, { useState, useEffect } from 'react';
import { Post, User, Story } from '../../types';
import { toggleLikePost, toggleBookmarkPost, getStories, subscribeToPosts } from '../../firebase';

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
    // Real-time listener will update the state naturally, 
    // but optimistic update improves UX
    setPosts(prev => prev.map(p => {
        if(p.id === postId) {
            const isLiked = p.likes.includes(currentUser.uid);
            return {
                ...p,
                likes: isLiked ? p.likes.filter(id => id !== currentUser.uid) : [...p.likes, currentUser.uid]
            };
        }
        return p;
    }));
  };

  const handleBookmark = async (postId: string) => {
    await toggleBookmarkPost(postId, currentUser.uid);
    setPosts(prev => prev.map(p => {
        if(p.id === postId) {
            const isBookmarked = p.bookmarks.includes(currentUser.uid);
            return {
                ...p,
                bookmarks: isBookmarked ? p.bookmarks.filter(id => id !== currentUser.uid) : [...p.bookmarks, currentUser.uid]
            };
        }
        return p;
    }));
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
        <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
                <div className="bg-primary size-8 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-white text-xl">blur_on</span>
                </div>
                <h1 className="text-xl font-black tracking-tighter">LUMINA</h1>
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
            <section className="w-full overflow-x-auto py-4">
                <div className="flex px-4 gap-5 min-w-max">
                    {/* My Story Add */}
                    <div className="flex flex-col items-center gap-2 w-16 group cursor-pointer" onClick={onUploadPost}>
                        <div className="relative w-16 h-16 rounded-full p-[2px] bg-slate-200 dark:bg-slate-800">
                            <img src={currentUser.photoURL} className="w-full h-full rounded-full object-cover border-2 border-background-dark" alt="" />
                            <div className="absolute bottom-0 right-0 bg-primary rounded-full border-2 border-background-dark p-0.5 flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[14px]">add</span>
                            </div>
                        </div>
                        <p className="text-[11px] font-medium opacity-70">Your Story</p>
                    </div>

                    {/* Active User Stories */}
                    {storyUserIds.map(uid => (
                        <div key={uid} className="flex flex-col items-center gap-2 w-16 cursor-pointer" onClick={() => onOpenStory(userStoriesMap[uid])}>
                            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-primary to-purple-500">
                                <img src={userStoriesMap[uid][0].userPhoto} className="w-full h-full rounded-full object-cover border-2 border-background-dark" alt="" />
                            </div>
                            <p className="text-[11px] font-medium truncate w-full text-center">{userStoriesMap[uid][0].userName.split(' ')[0]}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Feed List */}
            <main className="flex flex-col gap-8 pb-24">
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
                        <article key={post.id} className="relative w-full @container animate-in slide-in-from-bottom-5">
                            {/* Post Header Overlay */}
                            <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
                                <div className="flex items-center gap-3">
                                    <img src={post.userPhoto} className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-lg" alt="" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white leading-none shadow-sm">{post.userName}</span>
                                        <span className="text-[10px] text-white/70 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">location_on</span> {post.location || 'Unknown'}
                                        </span>
                                    </div>
                                </div>
                                <button className="text-white">
                                    <span className="material-symbols-outlined">more_vert</span>
                                </button>
                            </div>

                            {/* Main Media */}
                            <div className="w-full aspect-[4/5] bg-slate-900 overflow-hidden cursor-pointer" onClick={() => onOpenPost(post)}>
                                {post.mediaType === 'video' ? (
                                    <video src={post.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                ) : (
                                    <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
                                )}
                            </div>

                            {/* Interaction Bar */}
                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-3 flex flex-col gap-3">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={() => handleLike(post.id)}
                                                className={`flex items-center gap-1.5 transition-all active:scale-125 ${post.likes.includes(currentUser.uid) ? 'text-primary' : 'text-white'}`}
                                            >
                                                <span className="material-symbols-outlined" style={post.likes.includes(currentUser.uid) ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                                                <span className="text-xs font-semibold">{post.likes.length}</span>
                                            </button>
                                            <button 
                                                onClick={() => onOpenPost(post)}
                                                className="flex items-center gap-1.5 text-white"
                                            >
                                                <span className="material-symbols-outlined">chat_bubble</span>
                                                <span className="text-xs font-semibold">{post.commentCount}</span>
                                            </button>
                                            <button className="text-white hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined">send</span>
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => handleBookmark(post.id)}
                                            className={`transition-all active:scale-125 ${post.bookmarks.includes(currentUser.uid) ? 'text-primary' : 'text-white'}`}
                                        >
                                            <span className="material-symbols-outlined" style={post.bookmarks.includes(currentUser.uid) ? { fontVariationSettings: "'FILL' 1" } : {}}>bookmark</span>
                                        </button>
                                    </div>
                                    <div className="text-white text-[13px] leading-relaxed">
                                        <span className="font-bold mr-1">{post.userName}</span> 
                                        {post.caption} <button onClick={() => onOpenPost(post)} className="opacity-60 font-medium">more</button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </main>
        </div>
    </div>
  );
};
