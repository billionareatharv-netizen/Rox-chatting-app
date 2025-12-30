
import React, { useState, useEffect, useRef } from 'react';
import { Story, User } from '../../types';
import { likeStory, sendStoryReply, viewStory, deleteStory } from '../../firebase';

interface StoryViewerProps {
  stories: Story[];
  currentUser: User;
  onClose: () => void;
}

const QUICK_REACTIONS = ['😂', '❤️', '🔥', '😮', '😢', '🙌'];

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

  const story = stories[currentIndex];
  const isOwner = story && currentUser && String(story.userId) === String(currentUser.uid);

  useEffect(() => {
    if (!story) return;

    setIsLiked(story.likes?.includes(currentUser.uid) || false);
    setProgress(0);
    
    // Track view if not owner
    if (!isOwner) {
      viewStory(story.id, currentUser.uid, currentUser.name);
    }
    
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setIsPaused(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

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
        // If we deleted the last story, go back one, otherwise stay at same index (which is now the next story)
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
    
    if (customText) {
      setTimeout(handleNext, 800);
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col h-full transition-all overflow-hidden touch-none">
      {/* Top Header - Progress Bars & User Info */}
      <div className="absolute top-0 inset-x-0 z-[130] pt-8 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex gap-1.5 px-4 mb-4">
          {stories.map((_, idx) => {
            const barWidth = idx < currentIndex ? '100%' : idx === currentIndex ? progress + '%' : '0%';
            return (
              <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{ width: barWidth }}
                />
              </div>
            );
          })}
        </div>
        
        <div className="px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={story.userPhoto} className="w-11 h-11 rounded-full border-2 border-white/20 object-cover shadow-lg" alt="" />
            <div>
              <h4 className="text-white font-bold text-sm leading-none mb-1">{story.userName}</h4>
              <span className="text-white/60 text-[10px] uppercase font-black tracking-widest">
                {new Date(story.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => { setShowMenu(!showMenu); setIsPaused(!showMenu); }} 
                  className="p-2 text-white/50 hover:text-white transition-all active:scale-90"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                    <button 
                      onClick={handleDelete}
                      className="w-full px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 font-bold text-sm transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-all hover:scale-110 active:scale-90">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center relative bg-black">
        <div className="absolute inset-y-0 left-0 w-1/3 z-30 cursor-pointer" onClick={handlePrev} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-30 cursor-pointer" onClick={handleNext} />
        
        {showHeartAnim && (
          <div className="absolute z-[140] animate-ping">
            <svg className="w-32 h-32 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        )}

        {showSentAnim && (
          <div className="absolute z-[150] bg-indigo-600 px-6 py-3 rounded-full text-white font-bold shadow-2xl animate-in zoom-in duration-200">
            Sent! ✨
          </div>
        )}

        <div className="w-full h-full flex items-center justify-center">
          {story.mediaType === 'video' ? (
            <video 
              key={story.id}
              src={story.mediaUrl} 
              className="max-h-full w-full object-contain" 
              autoPlay 
              playsInline 
              muted={false}
              onPlay={() => !isPaused && setIsPaused(false)}
            />
          ) : (
            <img 
              key={story.id}
              src={story.mediaUrl} 
              className="max-h-full w-full object-contain select-none" 
              alt="" 
              onDoubleClick={handleLike}
            />
          )}
        </div>

        {story.caption && !replyText && (
          <div className="absolute bottom-10 inset-x-0 p-8 text-center bg-gradient-to-t from-black/90 via-black/40 to-transparent z-40">
            <p className="text-white text-lg font-bold drop-shadow-2xl px-4">{story.caption}</p>
          </div>
        )}
      </div>

      {/* Fixed Footer - Interaction UI */}
      <div className="bg-black/80 backdrop-blur-3xl border-t border-white/10 z-[120] pb-10 pt-4 shrink-0 px-6">
        <div className="max-w-2xl mx-auto">
          {!replyText && !isOwner && (
            <div className="flex justify-between items-center mb-5 px-1 animate-in slide-in-from-bottom-2">
              {QUICK_REACTIONS.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => handleReply(undefined, emoji)}
                  className="text-2xl hover:scale-135 transition-all p-2 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            {isOwner ? (
              <div className="flex items-center justify-center w-full py-4 opacity-60">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Viewing Your Status</span>
              </div>
            ) : (
              <form onSubmit={handleReply} className="flex-1 flex items-center gap-3">
                <input 
                  type="text"
                  placeholder={`Reply to ${story.userName.split(' ')[0]}...`}
                  value={replyText}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => !replyText && setIsPaused(false)}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-[1.5rem] px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-medium"
                />
                
                {replyText.trim() ? (
                  <button type="submit" className="text-white bg-indigo-500 p-4 rounded-[1.25rem] hover:bg-indigo-600 transition-all active:scale-90 shadow-lg shadow-indigo-500/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleLike}
                    className={`p-3 transition-all active:scale-[1.4] duration-300 ${isLiked ? 'text-red-500' : 'text-white/60 hover:text-white'}`}
                  >
                    <svg className={`w-9 h-9 ${isLiked ? 'fill-current' : 'fill-none stroke-current'}`} strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
