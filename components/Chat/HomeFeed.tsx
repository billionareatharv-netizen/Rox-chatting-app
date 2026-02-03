
import React, { useState, useEffect } from 'react';
import { Post, User, Story } from '../../types';
import { getFeedPosts, toggleLikePost, toggleBookmarkPost, getStories } from '../../firebase';

interface HomeFeedProps {
  currentUser: User;
  onOpenDMs: () => void;
  onUploadPost: () => void;
  onOpenStory: (stories: Story[]) => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({ currentUser, onOpenDMs, onUploadPost, onOpenStory }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [feed, activeStories] = await Promise.all([
        getFeedPosts(),
        getStories()
      ]);
      setPosts(feed);
      setStories(activeStories);
      setLoading(false);
    };
    load();
  }, []);

  const handleLike = async (postId: string) => {
    await toggleLikePost(postId, currentUser.uid);
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
            <section className="w-full overflow-x-auto py-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex px-4 gap-5 min-w-max">
                    {/* My Story */}
                    <div className="flex flex-col items-center gap-2 w-16 group cursor-pointer" onClick={() => onOpenStory(userStoriesMap[currentUser.uid] || [])}>
                        <div className="relative w-16 h-16 rounded-full p-[2px] bg-slate-200 dark:bg-slate-800">
                            <img src={currentUser.photoURL} className="w-full h-full rounded-full object-cover border-2 border-background-dark" alt="" />
                            <div className="absolute bottom-0 right-0 bg-primary rounded-full border-2 border-background-dark p-0.5 flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[14px]">add</span>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">Your Story</p>
                    </div>
                    {/* Others */}
                    {storyUserIds.filter(id => id !== currentUser.uid).map(uid => (
                        <div key={uid} className="flex flex-col items-center gap-2 w-16 cursor-pointer" onClick={() => onOpenStory(userStoriesMap[uid])}>
                            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-primary to-purple-500">
                                <img src={userStoriesMap[uid][0].userPhoto} className="w-full h-full rounded-full object-cover border-2 border-background-dark" alt="" />
                            </div>
                            <p className="text-[10px] font-bold truncate w-full text-center tracking-tighter">{userStoriesMap[uid][0].userName.split(' ')[0]}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Feed List */}
            <main className="flex flex-col gap-6 pt-6">
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
                        <article key={post.id} className="relative w-full overflow-hidden">
                            {/* Post Header */}
                            <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                                <div className="flex items-center gap-3">
                                    <img src={post.userPhoto} className="w-10 h-10 rounded-full border border-white/20 object-cover" alt="" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-white leading-none tracking-tight">{post.userName}</span>
                                        <span className="text-[9px] font-bold text-white/70 flex items-center gap-1 uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-[10px]">location_on</span> {post.location || 'Discovery'}
                                        </span>
                                    </div>
                                </div>
                                <button className="text-white opacity-80"><span className="material-symbols-outlined">more_vert</span></button>
                            </div>

                            {/* Post Media */}
                            <div className="w-full aspect-[4/5] bg-slate-900 overflow-hidden">
                                {post.mediaType === 'video' ? (
                                    <video src={post.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                ) : (
                                    <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
                                )}
                            </div>

                            {/* Interaction Bar */}
                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-3 flex flex-col gap-3 border border-white/10">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={() => handleLike(post.id)}
                                                className={`flex items-center gap-1.5 transition-all active:scale-125 ${post.likes.includes(currentUser.uid) ? 'text-primary' : 'text-white'}`}
                                            >
                                                <span className="material-symbols-outlined" style={post.likes.includes(currentUser.uid) ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                                                <span className="text-[10px] font-black uppercase">{post.likes.length}</span>
                                            </button>
                                            <button className="flex items-center gap-1.5 text-white">
                                                <span className="material-symbols-outlined">chat_bubble</span>
                                                <span className="text-[10px] font-black uppercase">{post.commentCount}</span>
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
                                    <div className="text-white text-xs leading-relaxed line-clamp-2">
                                        <span className="font-black mr-2 tracking-tighter">{post.userName}</span> 
                                        {post.caption || "Exploring the unknown."}
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
