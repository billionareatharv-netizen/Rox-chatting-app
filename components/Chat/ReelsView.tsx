import React, { useState, useEffect, useRef } from 'react';
import { Post, User } from '../../types';
import { getFeedPosts, toggleLikePost, toggleBookmarkPost, getUserById } from '../../firebase';

interface ReelsViewProps {
  currentUser: User;
  onOpenProfile: (user: User) => void;
  onOpenComments: (post: Post) => void;
}

export const ReelsView: React.FC<ReelsViewProps> = ({ currentUser, onOpenProfile, onOpenComments }) => {
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getFeedPosts().then(posts => {
        // Filter only video posts
        const videoPosts = posts.filter(p => p.mediaType === 'video');
        setReels(videoPosts);
        setLoading(false);
    });
  }, []);

  const handleLike = async (postId: string) => {
    await toggleLikePost(postId, currentUser.uid);
    setReels(prev => prev.map(p => {
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

  if (loading) {
    return (
        <div className="flex-1 bg-black flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        </div>
    );
  }

  if (reels.length === 0) {
      return (
          <div className="flex-1 bg-black flex flex-col items-center justify-center text-white/40 gap-4">
              <span className="material-symbols-outlined text-7xl">movie_off</span>
              <p className="font-black uppercase tracking-widest text-xs">No reels posted yet</p>
          </div>
      );
  }

  return (
    <div 
        ref={scrollRef}
        className="flex-1 bg-black overflow-y-auto no-scrollbar snap-y snap-mandatory h-full"
    >
        {reels.map((reel) => (
            <div 
                key={reel.id} 
                className="relative h-full w-full snap-start overflow-hidden flex flex-col items-center justify-center"
            >
                {/* Background Video */}
                <video 
                    src={reel.mediaUrl} 
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    autoPlay 
                    loop 
                    muted={false} 
                    playsInline
                />
                
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none"></div>

                {/* Right Side Actions */}
                <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
                    <div className="flex flex-col items-center gap-1">
                        <button 
                            onClick={() => handleLike(reel.id)}
                            className={`size-12 rounded-full flex items-center justify-center backdrop-blur-md bg-white/10 border border-white/10 active:scale-125 transition-transform ${reel.likes.includes(currentUser.uid) ? 'text-rose-500' : 'text-white'}`}
                        >
                            <span className="material-symbols-outlined text-3xl" style={reel.likes.includes(currentUser.uid) ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                        </button>
                        <span className="text-[10px] font-black text-white shadow-sm uppercase tracking-widest">{reel.likes.length}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <button 
                            onClick={() => onOpenComments(reel)}
                            className="size-12 rounded-full flex items-center justify-center backdrop-blur-md bg-white/10 border border-white/10 active:scale-110 transition-transform text-white"
                        >
                            <span className="material-symbols-outlined text-3xl">chat_bubble</span>
                        </button>
                        <span className="text-[10px] font-black text-white shadow-sm uppercase tracking-widest">{reel.commentCount}</span>
                    </div>

                    <button className="size-12 rounded-full flex items-center justify-center backdrop-blur-md bg-white/10 border border-white/10 text-white">
                        <span className="material-symbols-outlined text-3xl">send</span>
                    </button>

                    <button className="size-12 rounded-full flex items-center justify-center backdrop-blur-md bg-white/10 border border-white/10 text-white">
                        <span className="material-symbols-outlined text-3xl">more_vert</span>
                    </button>
                    
                    <div className="size-10 rounded-xl border-2 border-white/40 overflow-hidden animate-spin-slow">
                        <img src={reel.userPhoto} className="w-full h-full object-cover" alt="" />
                    </div>
                </div>

                {/* Bottom Info Area */}
                <div className="absolute bottom-10 left-0 right-16 p-6 z-10">
                    <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={async () => {
                        const user = await getUserById(reel.userId);
                        if(user) onOpenProfile(user);
                    }}>
                        <img src={reel.userPhoto} className="size-10 rounded-full border-2 border-primary object-cover" alt="" />
                        <div className="flex items-center gap-2">
                            <span className="text-white font-black text-sm tracking-tight">@{reel.userName.replace(/\s/g, '').toLowerCase()}</span>
                            <button className="px-3 py-1 bg-transparent border border-white/40 rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-white hover:text-black transition-all">Follow</button>
                        </div>
                    </div>
                    
                    <p className="text-white text-sm font-medium line-clamp-2 leading-relaxed mb-4">
                        {reel.caption}
                    </p>

                    <div className="flex items-center gap-2 text-white/80">
                        <span className="material-symbols-outlined text-sm">music_note</span>
                        <div className="flex overflow-hidden w-40">
                            <p className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap animate-marquee">
                                Original Audio - {reel.userName} • ROXX Sounds
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
  );
};