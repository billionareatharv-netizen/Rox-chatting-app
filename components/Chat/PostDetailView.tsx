import React, { useState, useEffect, useRef } from 'react';
import { User, Post, Comment } from '../../types';
import { aiService } from '../../src/services/aiService';
import { 
  toggleLikePost, 
  toggleBookmarkPost, 
  addComment, 
  subscribeToComments, 
  subscribeToPost, 
  toggleFollow, 
  subscribeToUser 
} from '../../firebase';

interface PostDetailViewProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onOpenProfile: (uid: string) => void;
}

export const PostDetailView: React.FC<PostDetailViewProps> = ({ 
  post: initialPost, 
  currentUser, 
  onClose, 
  onOpenProfile 
}) => {
  const [post, setPost] = useState<Post>(initialPost);
  const [author, setAuthor] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [isFollowing, setIsFollowing] = useState(currentUser.following?.includes(initialPost.userId) || false);
  
  const commentInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Real-time synchronization
    const unsubPost = subscribeToPost(initialPost.id, (updated) => setPost(updated));
    const unsubComments = subscribeToComments(initialPost.id, (list) => {
        const visibleComments = list.filter(c => !c.isFlagged || c.userId === currentUser.uid);
        setComments(visibleComments);
        // If there are comments, suggest replies to the latest one
        if (visibleComments.length > 0 && visibleComments[0].userId !== currentUser.uid) {
            aiService.suggestCommentReplies(visibleComments[0].text).then(setSuggestedReplies);
        }
    });
    const unsubAuthor = subscribeToUser(initialPost.userId, (u) => {
        if(u) {
            setAuthor(u as User);
            setIsFollowing(currentUser.following?.includes(u.uid) || false);
        }
    });
    
    return () => { 
        unsubPost(); 
        unsubComments(); 
        unsubAuthor(); 
    };
  }, [initialPost.id, initialPost.userId, currentUser.following]);

  const handleLike = async () => {
    const isLiked = post.likes.includes(currentUser.uid);
    if (!isLiked) {
        setShowHeartAnim(true);
        setTimeout(() => setShowHeartAnim(false), 1000);
    }
    await toggleLikePost(post.id, currentUser.uid);
  };

  const handleBookmark = async () => {
    await toggleBookmarkPost(post.id, currentUser.uid);
  };

  const handleFollow = async (e: React.MouseEvent) => {
      e.stopPropagation();
      await toggleFollow(currentUser.uid, post.userId);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
        // AI Content Filtering
        const filterResult = await aiService.filterContent(newComment);
        if (!filterResult.isSafe) {
            alert(`Comment flagged: ${filterResult.reason || "Inappropriate content detected."}. It will be reviewed.`);
            await addComment(post.id, {
                userId: currentUser.uid,
                userName: currentUser.name,
                userPhoto: currentUser.photoURL,
                text: newComment.trim(),
                isFlagged: true,
                flagReason: filterResult.reason
            });
            setNewComment('');
            setSuggestedReplies([]);
            return;
        }

        await addComment(post.id, {
            userId: currentUser.uid,
            userName: currentUser.name,
            userPhoto: currentUser.photoURL,
            text: newComment.trim()
        });
        setNewComment('');
        setSuggestedReplies([]);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAIRefine = async () => {
    if (!newComment.trim() || isAIGenerating) return;
    setIsAIGenerating(true);
    try {
        const refined = await aiService.refineText(newComment);
        setNewComment(refined);
    } finally {
        setIsAIGenerating(false);
    }
  };

  const formatTimestamp = (ts: number) => {
      const diff = Date.now() - ts;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours}h ago`;
      return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatCount = (count: number) => {
      if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
      return count.toString();
  };

  const isLiked = post.likes.includes(currentUser.uid);
  const isBookmarked = post.bookmarks?.includes(currentUser.uid);

  return (
    <div className="fixed inset-0 z-[600] bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden h-[100dvh]">
        
        {/* Top Navigation Bar */}
        <header className="fixed top-0 z-50 w-full flex items-center justify-between p-4 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5">
            <button 
                onClick={onClose} 
                className="flex size-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-90"
            >
                <span className="material-symbols-outlined font-bold">arrow_back_ios_new</span>
            </button>
            <div className="flex flex-col items-center">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Post</span>
                <span className="text-sm font-bold tracking-tight">Explore</span>
            </div>
            <button className="flex size-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/20">
                <span className="material-symbols-outlined">more_horiz</span>
            </button>
        </header>

        {/* Scrollable Content */}
        <main ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar pt-20 pb-24">
            
            {/* Main Media Section */}
            <div className="px-4">
                <div 
                    className="relative w-full aspect-[4/5] bg-slate-200 dark:bg-slate-800 rounded-[1.5rem] overflow-hidden shadow-2xl border border-black/5 dark:border-white/5 group"
                    onDoubleClick={handleLike}
                >
                    {post.mediaType === 'video' ? (
                        <video src={post.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                    ) : (
                        <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
                    )}
                    
                    {/* Location Tag Overlay */}
                    <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-lg border border-white/10 text-white">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        <span className="text-[12px] font-bold tracking-tight">{post.location || 'Cyber Space'}</span>
                    </div>

                    {/* Big Heart Animation */}
                    {showHeartAnim && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <span className="material-symbols-outlined text-white text-[100px] animate-ping opacity-70" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Author Header Section */}
            <div className="flex p-4 mt-2 items-center justify-between">
                <div className="flex gap-3 cursor-pointer" onClick={() => onOpenProfile(post.userId)}>
                    <img src={post.userPhoto} className="size-12 rounded-full border-2 border-primary/50 object-cover shadow-sm" alt="" />
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-1">
                            <p className="text-slate-900 dark:text-white text-base font-black tracking-tight">{post.userName}</p>
                            {author?.isAdmin && <span className="material-symbols-outlined text-primary text-[16px] filled-icon" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
                        </div>
                        <p className="text-slate-500 dark:text-[#a19cba] text-xs font-bold uppercase tracking-widest">{formatTimestamp(post.timestamp)}</p>
                    </div>
                </div>
                {post.userId !== currentUser.uid && (
                    <button 
                        onClick={handleFollow}
                        className={`flex min-w-[100px] items-center justify-center rounded-full h-9 px-4 text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(51,13,242,0.2)] ${isFollowing ? 'bg-slate-200 dark:bg-white/10 text-slate-500' : 'bg-primary text-white'}`}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                )}
            </div>

            {/* Reaction Bar */}
            <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-1">
                    <button 
                        onClick={handleLike} 
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-110"
                    >
                        <span className={`material-symbols-outlined text-2xl ${isLiked ? 'text-rose-500' : 'text-slate-500 dark:text-[#a19cba]'}`} style={isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                        <p className="text-slate-900 dark:text-white text-[14px] font-black">{formatCount(post.likes.length)}</p>
                    </button>
                    <button 
                        onClick={() => commentInputRef.current?.focus()} 
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                    >
                        <span className="material-symbols-outlined text-slate-500 dark:text-[#a19cba] text-2xl">chat_bubble</span>
                        <p className="text-slate-500 dark:text-[#a19cba] text-[14px] font-black">{formatCount(comments.length)}</p>
                    </button>
                    <button className="flex items-center justify-center px-3 py-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                        <span className="material-symbols-outlined text-slate-500 dark:text-[#a19cba] text-2xl">send</span>
                    </button>
                </div>
                <button 
                    onClick={handleBookmark} 
                    className={`flex items-center justify-center px-3 py-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-110 ${isBookmarked ? 'text-primary' : 'text-slate-500 dark:text-[#a19cba]'}`}
                >
                    <span className="material-symbols-outlined text-2xl" style={isBookmarked ? { fontVariationSettings: "'FILL' 1" } : {}}>bookmark</span>
                </button>
            </div>

            {/* Post Caption */}
            <div className="px-5 py-2">
                <p className="text-slate-800 dark:text-white text-sm leading-relaxed font-medium">
                    <span className="font-black mr-2">@{post.userName.toLowerCase().replace(/\s/g, '_')}</span>
                    {post.caption}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-primary font-black text-[10px] uppercase tracking-widest cursor-pointer hover:underline">#lumina</span>
                    <span className="text-primary font-black text-[10px] uppercase tracking-widest cursor-pointer hover:underline">#aesthetic</span>
                    <span className="text-primary font-black text-[10px] uppercase tracking-widest cursor-pointer hover:underline">#explore</span>
                </div>
            </div>

            {/* Comments List */}
            <div className="mt-4 px-5 pb-10">
                <p className="text-slate-500 dark:text-[#a19cba] text-[10px] font-bold uppercase tracking-widest mb-3">Recent Comments</p>
                <div className="space-y-4">
                    {comments.length === 0 ? (
                        <div className="py-6 text-center opacity-30 flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl">chat_bubble_outline</span>
                            <p className="text-[10px] font-black uppercase tracking-widest">No comments yet</p>
                        </div>
                    ) : (
                        comments.slice(0, 5).map(c => (
                            <div key={c.id} className="flex gap-3 animate-in slide-in-from-left-2">
                                <img src={c.userPhoto} className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-100 dark:border-white/10" alt="" />
                                <div className="flex flex-col bg-black/5 dark:bg-white/5 p-3 rounded-2xl rounded-tl-none flex-1">
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">@{c.userName.toLowerCase().replace(/\s/g, '_')}</p>
                                    <p className="text-xs text-slate-600 dark:text-[#a19cba] leading-snug">{c.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {comments.length > 5 && (
                    <button className="mt-4 text-primary text-xs font-bold">View all {comments.length} comments</button>
                )}
            </div>
        </main>

        {/* Bottom Interaction Bar */}
        <footer className="fixed bottom-0 inset-x-0 z-50 p-4 pb-8 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/5">
            {/* AI Suggested Replies */}
            {suggestedReplies.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar py-1">
                    {suggestedReplies.map((reply, i) => (
                        <button 
                            key={i}
                            onClick={() => setNewComment(reply)}
                            className="shrink-0 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[11px] font-bold text-primary whitespace-nowrap active:scale-95 transition-all"
                        >
                            {reply}
                        </button>
                    ))}
                </div>
            )}
            
            <div className="max-w-[480px] mx-auto flex items-center gap-3">
                <img src={currentUser.photoURL} className="size-10 rounded-full border border-black/10 dark:border-white/20 object-cover" alt="" />
                <form onSubmit={handlePostComment} className="flex-1 relative flex items-center">
                    <input 
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full h-11 bg-black/5 dark:bg-white/10 border-none rounded-full px-5 pr-20 text-sm font-medium focus:ring-2 focus:ring-primary placeholder:text-slate-400 dark:placeholder-[#a19cba] text-slate-900 dark:text-white" 
                        placeholder="Add a comment..." 
                        type="text"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                        {newComment.trim() && (
                            <button 
                                type="button"
                                onClick={handleAIRefine}
                                disabled={isAIGenerating}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-full transition-all"
                                title="AI Refine"
                            >
                                <span className={`material-symbols-outlined text-lg ${isAIGenerating ? 'animate-spin' : ''}`}>auto_fix_high</span>
                            </button>
                        )}
                        <button 
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            className={`font-bold text-sm px-2 transition-all ${newComment.trim() && !isSubmitting ? 'text-primary scale-110' : 'text-slate-400 opacity-50'}`}
                        >
                            {isSubmitting ? '...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
            {/* iOS Home Indicator Visual */}
            <div className="fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-black/10 dark:bg-white/20 rounded-full z-[60]"></div>
        </footer>
    </div>
  );
};
