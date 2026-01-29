
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
    
    if (customText) setTimeout(handleNext, 800);
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col h-full transition-all overflow-hidden touch-none">
      {/* Header with Progress Bars */}
      <div className="absolute top-0 inset-x-0 z-[130] pt-4 safe-area-top bg-gradient-to-b from-black/60 to-transparent pb-8">
        <div className="flex gap-1.5 px-3 mb-3">
          {stories.map((_, idx) => {
            const barWidth = idx < currentIndex ? '100%' : idx === currentIndex ? progress + '%' : '0%';
            return (
              <div key={idx} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: barWidth }} />
              </div>
            );
          })}
        </div>
        
        <div className="px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={story.userPhoto} className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-sm" alt="" />
            <div>
              <h4 className="text-white font-bold text-sm leading-none mb-0.5 shadow-black drop-shadow-md">{story.userName}</h4>
              <span className="text-white/80 text-[10px] font-medium drop-shadow-md">
                {new Date(story.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isOwner && (
              <div className="relative" ref={menuRef}>
                <button onClick={() => { setShowMenu(!showMenu); setIsPaused(!showMenu); }} className="text-white drop-shadow-md">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95">
                    <button onClick={handleDelete} className="w-full px-4 py-3 flex items-center gap-2 text-red-500 font-bold text-xs hover:bg-red-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
            <button onClick={onClose} className="text-white drop-shadow-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Media Content */}
      <div className="flex-1 flex items-center justify-center relative bg-black">
        <div className="absolute inset-y-0 left-0 w-1/3 z-30 cursor-pointer" onClick={handlePrev} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-30 cursor-pointer" onClick={handleNext} />
        
        {showHeartAnim && (
          <div className="absolute z-[140] animate-ping pointer-events-none">
            <svg className="w-32 h-32 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        )}

        {showSentAnim && (
          <div className="absolute z-[150] bg-black/60 backdrop-blur-md px-6 py-3 rounded-full text-white font-bold border border-white/20 animate-in zoom-in">
            Sent! ✨
          </div>
        )}

        {story.mediaType === 'video' ? (
            story.mediaUrl ? (
                <video key={story.id} src={story.mediaUrl} className="max-h-full w-full object-contain" autoPlay playsInline muted={false} onPlay={() => !isPaused && setIsPaused(false)} />
            ) : <div className="text-white text-sm font-bold opacity-70">Unavailable</div>
        ) : (
            <img key={story.id} src={story.mediaUrl} className="max-h-full w-full object-contain select-none" alt="" onDoubleClick={handleLike} />
        )}

        {/* Caption Area - Positioned above footer */}
        {story.caption && (
          <div className="absolute bottom-28 inset-x-0 flex justify-center z-40 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-xl max-w-[80%] text-center">
                <p className="text-white text-sm font-medium drop-shadow-md">{story.caption}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Area - Reply & Like */}
      <div className="absolute bottom-0 inset-x-0 z-[120] pb-6 pt-4 px-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent safe-area-bottom">
        {!isOwner ? (
            <div className="flex items-end gap-3 max-w-lg mx-auto">
                <form onSubmit={handleReply} className="flex-1 relative">
                    <input 
                      type="text"
                      placeholder="Send a reply..."
                      value={replyText}
                      onFocus={() => setIsPaused(true)}
                      onBlur={() => !replyText && setIsPaused(false)}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full pl-5 pr-12 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-1 focus:ring-white/50 text-sm font-medium"
                    />
                    {replyText && (
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500 rounded-full text-white">
                            <svg className="w-4 h-4 rotate-90 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                        </button>
                    )}
                </form>
                <button 
                  onClick={handleLike}
                  className={`p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 active:scale-90 transition-transform ${isLiked ? 'text-red-500' : 'text-white'}`}
                >
                    <svg className={`w-6 h-6 ${isLiked ? 'fill-current' : 'fill-none stroke-current'}`} strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                </button>
            </div>
        ) : (
            <div className="flex items-center justify-center gap-2 text-white/70 py-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <span className="text-xs font-bold uppercase tracking-widest">{story.views?.length || 0} Views</span>
            </div>
        )}
      </div>
    </div>
  );
};
