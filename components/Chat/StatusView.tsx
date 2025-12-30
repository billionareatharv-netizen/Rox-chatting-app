
import React, { useState, useEffect } from 'react';
import { User, Story, Chat } from '../../types';
import { getStories, getMyChats } from '../../firebase';

interface StatusViewProps {
  currentUser: User;
  onStoryUpload: () => void;
  onStoryView: (stories: Story[]) => void;
  onChatSelect: (chat: Chat) => void;
}

export const StatusView: React.FC<StatusViewProps> = ({ currentUser, onStoryUpload, onStoryView, onChatSelect }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [groups, setGroups] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedViewersStory, setSelectedViewersStory] = useState<Story | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [storyData, chatData] = await Promise.all([
        getStories(),
        getMyChats(currentUser.uid)
      ]);
      setStories(storyData);
      setGroups(chatData.filter(c => c.type === 'group'));
      setIsLoading(false);
    };
    fetchData();
    const itv = setInterval(fetchData, 5000); // Faster polling for "real-time" feel
    return () => clearInterval(itv);
  }, [currentUser.uid]);

  // Group stories by user
  const userStoriesMap: Record<string, Story[]> = {};
  stories.forEach(story => {
    if (!userStoriesMap[story.userId]) userStoriesMap[story.userId] = [];
    userStoriesMap[story.userId].push(story);
  });

  const myStories = userStoriesMap[currentUser.uid] || [];
  const others = Object.keys(userStoriesMap).filter(id => id !== currentUser.uid);

  const totalViews = myStories.reduce((acc, s) => acc + (s.views?.length || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <h2 className="text-2xl font-black tracking-tight">Status</h2>
        <button 
            onClick={onStoryUpload}
            className="p-3 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 no-scrollbar">
        {/* My Status Section */}
        <section>
          <h4 className="px-2 mb-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">My Status</h4>
          <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group">
            <div 
              onClick={myStories.length > 0 ? () => onStoryView(myStories) : onStoryUpload}
              className="flex items-center gap-4 cursor-pointer flex-1"
            >
              <div className={`relative w-14 h-14 rounded-full p-0.5 ${myStories.length > 0 ? 'bg-gradient-to-tr from-indigo-500 to-pink-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <img src={currentUser.photoURL} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900" alt="" />
                {myStories.length === 0 && (
                  <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow-md">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">My Status</p>
                <p className="text-xs text-slate-500 font-medium">{myStories.length > 0 ? `${myStories.length} updates posted` : 'Tap to add status'}</p>
              </div>
            </div>

            {myStories.length > 0 && (
              <button 
                onClick={() => setSelectedViewersStory(myStories[myStories.length - 1])}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group/btn"
              >
                <svg className="w-4 h-4 text-indigo-500 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-xs font-black text-slate-600 dark:text-slate-300">{totalViews}</span>
              </button>
            )}
          </div>
        </section>

        {/* Recent Updates Section */}
        <section>
          <h4 className="px-2 mb-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Recent Updates</h4>
          {others.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic text-xs font-medium bg-slate-50/50 dark:bg-slate-800/20 rounded-[2rem]">
              No recent status updates.
            </div>
          ) : (
            <div className="space-y-3">
              {others.map(uid => {
                const userStories = userStoriesMap[uid];
                const first = userStories[0];
                return (
                  <div 
                    key={uid}
                    onClick={() => onStoryView(userStories)}
                    className="flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-800 shadow-sm"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 p-0.5">
                      <img src={first.userPhoto} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900" alt="" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{first.userName}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{new Date(first.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Groups Section */}
        <section className="pb-10">
          <div className="flex items-center justify-between px-2 mb-4">
            <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">Your Groups</h4>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full font-black uppercase">{groups.length} total</span>
          </div>
          {groups.length === 0 ? (
             <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
               <p className="text-xs text-slate-400 font-bold">You aren't in any groups yet.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {groups.map(group => (
                <div 
                  key={group.id}
                  onClick={() => onChatSelect(group)}
                  className="flex items-center gap-4 p-4 rounded-3xl bg-white dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:border-indigo-200 transition-all cursor-pointer group shadow-sm"
                >
                  <img src={group.groupIcon || `https://picsum.photos/seed/${group.id}/200`} className="w-12 h-12 rounded-2xl object-cover shadow-md group-hover:scale-110 transition-transform" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{group.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {group.lastMessage ? `${group.lastMessage.text}` : 'No messages yet'}
                    </p>
                  </div>
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Viewers List Modal */}
      {selectedViewersStory && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-end animate-in slide-in-from-bottom duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedViewersStory(null)}></div>
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-[3rem] h-[65%] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
              <div>
                <h3 className="text-2xl font-black">Story Viewers</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {selectedViewersStory.views?.length || 0} People have seen this
                </p>
              </div>
              <button onClick={() => setSelectedViewersStory(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
              {(!selectedViewersStory.views || selectedViewersStory.views.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-6 opacity-60">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.2em]">No views yet</p>
                </div>
              ) : (
                selectedViewersStory.views.slice().sort((a, b) => b.timestamp - a.timestamp).map(v => (
                  <div key={v.userId} className="flex items-center gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/20 group">
                    <img src={`https://picsum.photos/seed/${v.userId}/200`} className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate">{v.userName}</p>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-4 py-1.5 rounded-xl uppercase tracking-widest border border-indigo-500/20">Seen</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
