
import React, { useState, useEffect, useRef } from 'react';
import { User, Post, Comment } from '../../types';
import { toggleLikePost, toggleBookmarkPost, addComment, subscribeToComments, subscribeToPost } from '../../firebase';

interface PostDetailViewProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onOpenProfile: (uid: string) => void;
}

export const PostDetailView: React.FC<PostDetailViewProps> = ({ post: initialPost, currentUser, onClose, onOpenProfile }) => {
  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const commentInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Real-time Post updates (likes count, etc)
    const unsubPost = subscribeToPost(post.id, (updated) => setPost(updated));
    // Real-time Comments
    const unsubComments = subscribeToComments(post.id, (list) => setComments(list));
    
    return () => { unsubPost(); unsubComments(); };
  }, [post.id]);

  const handleLike = async () => {
    if (!post.likes.includes(currentUser.uid)) {
        setShowHeartAnim(true);
        setTimeout(() => setShowHeartAnim(false), 1000);
    }
    await toggleLikePost(post.id, currentUser.uid);
  };

  const handleBookmark = async () => {
    await toggleBookmarkPost(post.id, currentUser.uid);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
        await addComment(post.id, {
            userId: currentUser.uid,
            userName: currentUser.name,
            userPhoto: currentUser.photoURL,
            text: newComment.trim()
        });
        setNewComment('');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Header - Clean Navigation */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-4">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-slate-200 dark:active:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-[28px]">arrow_back_ios</span>
                </button>
                <div className="flex flex-col">
                    <h2 className="text-lg font-black tracking-tighter uppercase leading-none">Post</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Explore feed</p>
                </div>
            </div>
            <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">more_horiz</span>
            </button>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
            
            {/* User Info Bar */}
            <section className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onOpenProfile(post.userId)}>
                    <img src={post.userPhoto} className="size-10 rounded-full object-cover border-2 border-primary/20" alt="" />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold leading-tight">{post.userName}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{post.location || 'Universe'}</span>
                    </div>
                </div>
                <button className="px-4 py-1.5 bg-slate-200 dark:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                    Follow
                </button>
            </section>

            {/* Main Media with Animation Layer */}
            <section className="relative w-full aspect-square bg-slate-900 overflow-hidden group" onDoubleClick={handleLike}>
                {post.mediaType === 'video' ? (
                    <video src={post.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                    <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
                )}
                
                {/* Heart Animation on Like */}
                {showHeartAnim && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="animate-bounce-in">
                            <span className="material-symbols-outlined text-red-500 text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        </div>
                    </div>
                )}
            </section>

            {/* Interaction Bar */}
            <section className="px-4 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={handleLike}
                        className={`flex flex-col items-center gap-1 transition-all active:scale-150 ${post.likes.includes(currentUser.uid) ? 'text-primary' : 'text-slate-900 dark:text-white'}`}
                    >
                        <span className="material-symbols-outlined text-3xl" style={post.likes.includes(currentUser.uid) ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                        <span className="text-[10px] font-black">{post.likes.length}</span>
                    </button>
                    <button 
                        onClick={() => commentInputRef.current?.focus()}
                        className="flex flex-col items-center gap-1 text-slate-900 dark:text-white"
                    >
                        <span className="material-symbols-outlined text-3xl">chat_bubble</span>
                        <span className="text-[10px] font-black">{post.commentCount}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-slate-900 dark:text-white hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-3xl">send</span>
                        <span className="text-[10px] font-black">Share</span>
                    </button>
                </div>
                <button 
                    onClick={handleBookmark}
                    className={`transition-all active:scale-125 ${post.bookmarks.includes(currentUser.uid) ? 'text-primary' : 'text-slate-900 dark:text-white'}`}
                >
                    <span className="material-symbols-outlined text-3xl" style={post.bookmarks.includes(currentUser.uid) ? { fontVariationSettings: "'FILL' 1" } : {}}>bookmark</span>
                </button>
            </section>

            {/* Caption Section */}
            <section className="px-5 mt-4 space-y-2">
                <p className="text-sm leading-relaxed">
                    <span className="font-black mr-2">@{post.userName.toLowerCase()}</span>
                    {post.caption}
                </p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {new Date(post.timestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                </p>
            </section>

            {/* Comments List */}
            <section className="px-5 mt-8 space-y-6">
                <h3 className="text-[11px] font-black uppercase text-primary tracking-[0.2em] mb-4">Comments</h3>
                
                {comments.length === 0 ? (
                    <div className="flex flex-col items-center py-10 opacity-30">
                        <span className="material-symbols-outlined text-4xl">chat</span>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2">No comments yet</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {comments.map(c => (
                            <div key={c.id} className="flex gap-4 group animate-in fade-in slide-in-from-left-2">
                                <img src={c.userPhoto} className="size-8 rounded-full object-cover shrink-0" alt="" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black">@{c.userName.toLowerCase().replace(' ', '_')}</span>
                                        <span className="text-[9px] text-slate-500 font-bold">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-snug">{c.text}</p>
                                    <button className="text-[9px] font-black uppercase text-slate-500 mt-2 hover:text-primary transition-colors">Reply</button>
                                </div>
                                <button className="self-start text-slate-400 group-hover:text-red-500 transition-colors">
                                    <span className="material-symbols-outlined text-sm">favorite</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>

        {/* Floating Comment Input Bar */}
        <div className="fixed bottom-0 inset-x-0 p-4 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5 safe-area-bottom">
            <div className="max-w-xl mx-auto flex items-center gap-3">
                <img src={currentUser.photoURL} className="size-10 rounded-full object-cover border-2 border-primary/20 shadow-lg" alt="" />
                <form onSubmit={handlePostComment} className="flex-1 relative">
                    <input 
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={`Add a comment for ${post.userName}...`}
                        className="w-full h-12 pl-5 pr-12 bg-slate-200/50 dark:bg-white/5 border-none rounded-full focus:ring-2 focus:ring-primary text-sm font-medium"
                    />
                    <button 
                        type="submit"
                        disabled={!newComment.trim() || isSubmitting}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full flex items-center justify-center transition-all ${newComment.trim() ? 'bg-primary text-white shadow-lg' : 'bg-slate-300 dark:bg-white/10 text-slate-500'}`}
                    >
                        {isSubmitting ? (
                            <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <span className="material-symbols-outlined text-xl">arrow_upward</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
