
import React, { useState, useEffect, useRef } from 'react';
import { Story, User } from '../../types';
import { likeStory, sendStoryReply, viewStory, deleteStory } from '../../firebase';

interface StoryViewerProps {
  stories: Story[];
  currentUser: User;
  onClose: () => void;
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥'];

export const StoryViewer: React.FC<StoryViewerProps> = ({ stories: initialStories, currentUser, onClose }) => {
  const [stories, setStories] = useState(initialStories);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showSentAnim, setShowSentAnim] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const story = stories[currentIndex];
  const isOwner = story && currentUser && String(story.userId) === String(currentUser.uid);

  // Audio Playback Logic
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          
          if (story && story.music) {
              audioRef.current.src = story.music.url;
              audioRef.current.currentTime = story.music.startAt;
              if (!isPaused) {
                  audioRef.current.play().catch(e => console.warn("Audio autoplay blocked", e));
              }
          }
      }
  }, [currentIndex, story]);

  useEffect(() => {
      if(audioRef.current) {
          if(isPaused) audioRef.current.pause();
          else if(story && story.music && audioRef.current.src) audioRef.current.play().catch(()=>{});
      }
  }, [isPaused]);

  useEffect(() => {
    if (!story) return;

    setIsLiked(story.likes?.includes(currentUser.uid) || false);
    setProgress(0);
    
    if (!isOwner) viewStory(story.id, currentUser.uid, currentUser.name);
    
    if (isPaused) return;

    const duration = story.mediaType === 'video' ? 10000 : 5000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, story?.id, stories.length]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDelete = async () => {
    if (!story) return;
    if (window.confirm("Delete this story permanently?")) {
      await deleteStory(story.id);
      const newStories = stories.filter(s => s.id !== story.id);
      if (newStories.length === 0) {
        onClose();
      } else {
        setStories(newStories);
        if (currentIndex >= newStories.length) {
          setCurrentIndex(newStories.length - 1);
        }
      }
      setShowMenu(false);
      setIsPaused(false);
    }
  };

  const handleLike = async () => {
    if (!isLiked) {
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);
    }
    setIsLiked(!isLiked);
    await likeStory(story.id, currentUser.uid);
  };

  const triggerSentAnim = () => {
    setShowSentAnim(true);
    setTimeout(() => setShowSentAnim(false), 1500);
  };

  const handleReply = async (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault();
    const text = customText || replyText.trim();
    if (!text) return;
    
    setReplyText('');
    setIsPaused(false);
    
    await sendStoryReply(story.userId, currentUser.uid, text, story);
    triggerSentAnim();
    
    // Auto-advance if it was a quick reaction to keep it snappy
    if (customText) {
        setTimeout(handleNext, 800);
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-[#131022] flex flex-col h-full transition-all overflow-hidden touch-none font-display">
      
      {/* Hidden Audio Player */}
      <audio ref={audioRef} loop={false} />

      {/* Main Background Media */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-center bg-no-repeat bg-cover flex items-center justify-center">
            {story.mediaType === 'video' ? (
                <video key={story.id} src={story.mediaUrl} className="w-full h-full object-cover" autoPlay playsInline muted={false} onPlay={() => !isPaused && setIsPaused(false)} />
            ) : (
                <img key={story.id} src={story.mediaUrl} className="w-full h-full object-cover" alt="" onDoubleClick={handleLike} />
            )}
        </div>
      </div>

      {/* Top Header Overlay */}
      <div className="relative z-10 pt-6 px-4 pb-20 bg-gradient-to-b from-black/60 to-transparent">
        {/* Progress Bars */}
        <div className="flex w-full flex-row items-center justify-center gap-1.5 py-2">
            {stories.map((_, idx) => {
                const barWidth = idx < currentIndex ? '100%' : idx === currentIndex ? progress + '%' : '0%';
                return (
                    <div key={idx} className="h-1 flex-1 rounded-full bg-white/40 overflow-hidden">
                        <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: barWidth }}></div>
                    </div>
                );
            })}
        </div>

        {/* User Info Bar */}
        <div className="flex items-center mt-3 justify-between">
            <div className="flex items-center gap-3">
                <div className="border-2 border-primary p-0.5 rounded-full shadow-lg">
                    <img src={story.userPhoto} className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 object-cover" alt="" />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h2 className="text-white text-sm font-bold leading-tight tracking-tight shadow-sm">{story.userName}</h2>
                        <span className="text-white/60 text-xs font-medium drop-shadow-md">
                            {new Date(story.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {isOwner && (
                    <button onClick={() => { setShowMenu(!showMenu); setIsPaused(!showMenu); }} className="flex items-center justify-center rounded-full h-10 w-10 text-white">
                        <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                )}
                <button onClick={onClose} className="flex items-center justify-center rounded-full h-10 w-10 text-white active:scale-90 transition-transform">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
        </div>
      </div>

      {/* Menu Modal (Owner Only) */}
      {showMenu && (
          <div className="absolute inset-0 z-[140] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#1a1826] rounded-3xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-slate-900 dark:text-white font-black text-lg mb-4 text-center">Story Options</h3>
                  <button onClick={handleDelete} className="w-full py-4 text-red-500 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all">
                      <span className="material-symbols-outlined">delete</span> Delete Story
                  </button>
                  <button onClick={() => { setShowMenu(false); setIsPaused(false); }} className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Cancel</button>
              </div>
          </div>
      )}

      {/* Tap Zones for Navigation */}
      <div className="absolute inset-y-0 left-0 w-1/4 z-20 cursor-pointer" onClick={handlePrev}></div>
      <div className="absolute inset-y-0 right-0 w-1/4 z-20 cursor-pointer" onClick={handleNext}></div>

      {/* Animations Overlays */}
      {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center z-[150] pointer-events-none">
              <span className="material-symbols-outlined text-red-500 text-[120px] animate-ping opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </div>
      )}

      {showSentAnim && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[160] bg-white/10 backdrop-blur-xl border border-white/20 px-8 py-4 rounded-full text-white font-black uppercase tracking-[0.2em] animate-in zoom-in">
              Sent! ✨
          </div>
      )}

      {/* Bottom Interface Area */}
      <div className="mt-auto relative z-30 px-4 pb-10 pt-20 bg-gradient-to-t from-black/80 to-transparent flex flex-col">
        
        {/* Emoji Reactions Tray (Functional) */}
        {!isOwner && (
            <div className="flex items-center justify-between mb-6 px-1 animate-in slide-in-from-bottom-4">
                {QUICK_REACTIONS.map(emoji => (
                    <button 
                        key={emoji}
                        onClick={() => handleReply(undefined, emoji)}
                        className="flex items-center justify-center w-12 h-12 rounded-2xl text-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:bg-white/20 active:scale-[1.3] transition-all duration-300"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        )}

        {/* Caption Bar (Visual) */}
        {story.caption && (
            <div className="mb-4 text-center px-4 animate-in slide-in-from-bottom-2">
                <p className="text-white text-sm font-medium leading-relaxed drop-shadow-lg bg-black/20 backdrop-blur-sm py-2 px-4 rounded-xl inline-block max-w-full truncate">{story.caption}</p>
            </div>
        )}

        {/* Music Indicator */}
        {story.music && (
            <div className="mb-4 flex items-center justify-center gap-2">
                <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2 animate-pulse">
                    <span className="text-sm">🎵</span>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{story.music.title}</span>
                </div>
            </div>
        )}

        {/* Input & Action Bar */}
        <div className="flex items-center gap-3">
            {!isOwner ? (
                <>
                    <div className="flex-1 h-12 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full px-4 flex items-center focus-within:bg-white/20 transition-all">
                        <form onSubmit={handleReply} className="w-full">
                            <input 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => !replyText && setIsPaused(false)}
                                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-white placeholder:text-white/60 w-full" 
                                placeholder="Send message..." 
                                type="text"
                            />
                        </form>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleLike}
                            className={`flex items-center justify-center transition-all active:scale-[1.5] ${isLiked ? 'text-red-500' : 'text-white'}`}
                        >
                            <span className="material-symbols-outlined text-[32px]" style={isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                        </button>
                        <button 
                            onClick={() => handleReply()}
                            className="flex items-center justify-center transition-transform active:scale-90 text-white"
                        >
                            <span className="material-symbols-outlined text-[32px]">send</span>
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex-1 py-4 flex items-center justify-center gap-2 text-white/70">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{story.views?.length || 0} Story Views</span>
                </div>
            )}
        </div>
      </div>

      {/* Music Sticker Center Visual */}
      {story.music && !isPaused && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center gap-4 animate-float opacity-40">
              <div className="size-24 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-4xl animate-spin-slow">💿</div>
          </div>
      )}
    </div>
  );
};
