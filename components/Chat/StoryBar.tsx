
import React, { useEffect, useState } from 'react';
import { User, Story } from '../../types';
import { getStories } from '../../firebase';

interface StoryBarProps {
  currentUser: User;
  onUploadClick: () => void;
  onStoryClick: (stories: Story[]) => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({ currentUser, onUploadClick, onStoryClick }) => {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    const loadStories = async () => {
      const data = await getStories();
      setStories(data);
    };
    loadStories();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadStories, 30000);
    return () => clearInterval(interval);
  }, []);

  // Group stories by user using a robust forEach loop
  const userStoriesMap: Record<string, Story[]> = {};
  stories.forEach(story => {
    if (!userStoriesMap[story.userId]) {
      userStoriesMap[story.userId] = [];
    }
    userStoriesMap[story.userId].push(story);
  });

  const myStories = userStoriesMap[currentUser.uid] || [];
  const otherUserIds = Object.keys(userStoriesMap).filter(id => id !== currentUser.uid);

  return (
    <div className="flex items-center gap-4 px-4 py-3 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
      {/* My Status */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="relative cursor-pointer group" onClick={myStories.length > 0 ? () => onStoryClick(myStories) : onUploadClick}>
          <div className={`w-16 h-16 rounded-full p-[3px] ${myStories.length > 0 ? 'bg-gradient-to-tr from-indigo-500 to-pink-500' : ''}`}>
            <img 
              src={currentUser.photoURL} 
              alt="My Status" 
              className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900"
            />
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onUploadClick(); }}
            className="absolute bottom-0 right-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md group-hover:scale-110 transition-transform"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">My Status</span>
      </div>

      {/* Others' Stories */}
      {otherUserIds.map(userId => {
        const userStories = userStoriesMap[userId];
        const firstStory = userStories[0];
        return (
          <div key={userId} className="flex flex-col items-center gap-1 shrink-0">
            <div className="cursor-pointer" onClick={() => onStoryClick(userStories)}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 p-[3px]">
                <img 
                  src={firstStory.userPhoto} 
                  alt={firstStory.userName} 
                  className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900"
                />
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate w-16 text-center">
              {firstStory.userName.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
};
