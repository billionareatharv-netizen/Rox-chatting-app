
import React, { useState, useEffect } from 'react';
import { User, Story, Chat, Note } from '../../types';
import { getStories, getMyChats, addNote, getNotes, sendNoteReply } from '../../firebase';

interface StatusViewProps {
  currentUser: User;
  onStoryUpload: () => void;
  onStoryView: (stories: Story[]) => void;
  onChatSelect: (chat: Chat) => void;
}

export const StatusView: React.FC<StatusViewProps> = ({ currentUser, onStoryUpload, onStoryView, onChatSelect }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [groups, setGroups] = useState<Chat[]>([]);
  const [selectedViewersStory, setSelectedViewersStory] = useState<Story | null>(null);
  
  // Note Creation
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Full Note Viewing
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [noteReplyText, setNoteReplyText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [storyData, chatData, noteData] = await Promise.all([
        getStories(),
        getMyChats(currentUser.uid),
        getNotes()
      ]);
      setStories(storyData);
      setGroups(chatData.filter(c => c.type === 'group'));
      setNotes(noteData as Note[]);
    };
    fetchData();
    const itv = setInterval(fetchData, 5000); 
    return () => clearInterval(itv);
  }, [currentUser.uid]);

  const handlePostNote = async () => {
    if (!noteText.trim()) return;
    await addNote(currentUser.uid, currentUser.name, currentUser.photoURL, noteText.trim().substring(0, 60));
    setNoteText('');
    setShowNoteInput(false);
    const newNote: Note = { 
        id: `note_${currentUser.uid}`, 
        userId: currentUser.uid, 
        userName: currentUser.name, 
        userPhoto: currentUser.photoURL, 
        text: noteText.trim(), 
        timestamp: Date.now() 
    };
    setNotes(prev => [newNote, ...prev.filter(n => n.userId !== currentUser.uid)]);
  };

  const handleSendNoteReply = async () => {
      if(!viewingNote || !noteReplyText.trim()) return;
      await sendNoteReply(viewingNote.userId, currentUser.uid, noteReplyText, viewingNote);
      alert("Reply Sent!");
      setNoteReplyText('');
      setViewingNote(null);
  };

  const userStoriesMap: Record<string, Story[]> = {};
  stories.forEach(story => {
    if (!userStoriesMap[story.userId]) userStoriesMap[story.userId] = [];
    userStoriesMap[story.userId].push(story);
  });

  const myStories = userStoriesMap[currentUser.uid] || [];
  const others = Object.keys(userStoriesMap).filter(id => id !== currentUser.uid);
  const totalViews = myStories.reduce((acc, s) => acc + (s.views?.length || 0), 0);

  const myNote = notes.find(n => n.userId === currentUser.uid);
  const otherNotes = notes.filter(n => n.userId !== currentUser.uid);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 animate-in fade-in duration-500">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Updates & Status</h2>
        <button 
            onClick={onStoryUpload}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-10 no-scrollbar">
        
        {/* NOTES SECTION */}
        <section>
            <h4 className="px-2 mb-4 text-[11px] font-black uppercase text-indigo-500 tracking-widest">Thought Bubbles</h4>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 px-2 snap-x">
                {/* My Note */}
                <div className="flex flex-col items-center gap-3 relative shrink-0 snap-start">
                    <div className="relative cursor-pointer group" onClick={() => setShowNoteInput(true)}>
                        <img src={currentUser.photoURL} className="w-16 h-16 rounded-[1.5rem] object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm" alt="" />
                        <div className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-xl max-w-[90px] min-w-[40px] flex justify-center border border-slate-100 dark:border-slate-700 group-hover:-translate-y-1 transition-transform">
                            {myNote ? (
                                <p className="text-[10px] font-bold text-center leading-tight line-clamp-2 text-slate-700 dark:text-slate-200">{myNote.text}</p>
                            ) : (
                                <span className="text-xl text-slate-400">+</span>
                            )}
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">Your Note</span>
                </div>

                {/* Other Notes */}
                {otherNotes.map(note => (
                    <div key={note.id} className="flex flex-col items-center gap-3 relative shrink-0 snap-start">
                        <div className="relative group cursor-pointer" onClick={() => setViewingNote(note)}>
                            <img src={note.userPhoto} className="w-16 h-16 rounded-[1.5rem] object-cover ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900" alt="" />
                            <div className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-xl max-w-[100px] border border-slate-100 dark:border-slate-700 z-10 group-hover:-translate-y-1 transition-transform">
                                <p className="text-[10px] font-bold text-center leading-tight line-clamp-2 text-slate-700 dark:text-slate-200">{note.text}</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 w-16 truncate text-center">{note.userName.split(' ')[0]}</span>
                    </div>
                ))}
            </div>
        </section>

        {/* My Status Section */}
        <section>
          <h4 className="px-2 mb-3 text-[11px] font-black uppercase text-indigo-500 tracking-widest">My Story</h4>
          <div className="flex items-center justify-between p-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
            <div 
              onClick={myStories.length > 0 ? () => onStoryView(myStories) : onStoryUpload}
              className="flex items-center gap-4 cursor-pointer flex-1"
            >
              <div className={`relative w-14 h-14 rounded-full p-[3px] ${myStories.length > 0 ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <img src={currentUser.photoURL} className="w-full h-full rounded-full object-cover border-[3px] border-white dark:border-slate-900" alt="" />
                {myStories.length === 0 && (
                  <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow-md">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white">My Status</p>
                <p className="text-xs text-slate-500 font-semibold">{myStories.length > 0 ? `${myStories.length} updates active` : 'Add to your story'}</p>
              </div>
            </div>

            {myStories.length > 0 && (
              <button 
                onClick={() => setSelectedViewersStory(myStories[myStories.length - 1])}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 hover:text-indigo-500 transition-all group"
              >
                <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-xs font-black">{totalViews}</span>
              </button>
            )}
          </div>
        </section>

        {/* Recent Updates Section */}
        <section>
          <h4 className="px-2 mb-3 text-[11px] font-black uppercase text-indigo-500 tracking-widest">Recent Updates</h4>
          {others.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No recent updates from friends.
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
                    className="flex items-center gap-4 p-3.5 rounded-[1.2rem] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50 group"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 p-[3px]">
                      <img src={first.userPhoto} className="w-full h-full rounded-full object-cover border-[3px] border-white dark:border-slate-900" alt="" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{first.userName}</p>
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
            <h4 className="text-[11px] font-black uppercase text-indigo-500 tracking-widest">Groups</h4>
            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">{groups.length}</span>
          </div>
          {groups.length === 0 ? (
             <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
               You aren't in any groups yet.
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {groups.map(group => (
                <div 
                  key={group.id}
                  onClick={() => onChatSelect(group)}
                  className="flex items-center gap-4 p-3.5 rounded-[1.2rem] bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all cursor-pointer group hover:shadow-sm"
                >
                  <img src={group.groupIcon || `https://picsum.photos/seed/${group.id}/200`} className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate text-slate-900 dark:text-white">{group.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                      {group.description || 'No description'}
                    </p>
                  </div>
                  <div className="p-2 text-slate-300 group-hover:text-indigo-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Full Note Viewer with Reply */}
      {viewingNote && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in zoom-in-95">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 w-full max-w-md shadow-2xl relative border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center">
                  <button onClick={() => setViewingNote(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  
                  <img src={viewingNote.userPhoto} className="w-24 h-24 rounded-full object-cover mb-4 ring-4 ring-indigo-500/20" alt="" />
                  <h3 className="text-xl font-bold mb-6">{viewingNote.userName}'s Note</h3>
                  
                  <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-3xl w-full mb-6 relative">
                      <span className="absolute top-2 left-4 text-4xl text-slate-300 dark:text-slate-600 font-serif">"</span>
                      <p className="text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed px-4">{viewingNote.text}</p>
                      <span className="absolute bottom-2 right-4 text-4xl text-slate-300 dark:text-slate-600 font-serif leading-none">"</span>
                  </div>

                  {viewingNote.userId !== currentUser.uid && (
                      <div className="w-full flex items-center gap-2">
                          <input 
                            value={noteReplyText} 
                            onChange={(e) => setNoteReplyText(e.target.value)}
                            placeholder="Reply to note..." 
                            className="flex-1 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none border border-transparent focus:border-indigo-500 transition-all"
                          />
                          <button 
                            onClick={handleSendNoteReply}
                            disabled={!noteReplyText.trim()}
                            className="p-3 bg-indigo-500 text-white rounded-xl shadow-lg active:scale-90 transition-transform disabled:opacity-50"
                          >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Note Input Modal */}
      {showNoteInput && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative border border-slate-200 dark:border-slate-800">
                <button onClick={() => setShowNoteInput(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto relative mb-4">
                        <img src={currentUser.photoURL} className="w-full h-full rounded-[1.5rem] object-cover shadow-lg" alt="" />
                        <div className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-md border border-slate-100 dark:border-slate-700">
                            <span className="text-xl">💭</span>
                        </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Share a thought</h3>
                </div>
                <input 
                    type="text" 
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    maxLength={60}
                    placeholder="What's on your mind?"
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 outline-none text-center font-bold text-slate-700 dark:text-slate-200 mb-2 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    autoFocus
                />
                <p className="text-center text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest">{noteText.length}/60</p>
                <button onClick={handlePostNote} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">Share Note</button>
            </div>
        </div>
      )}

      {/* Viewers List Modal */}
      {selectedViewersStory && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-end animate-in slide-in-from-bottom duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedViewersStory(null)}></div>
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-[3rem] h-[65%] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Story Viewers</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {selectedViewersStory.views?.length || 0} People have seen this
                </p>
              </div>
              <button onClick={() => setSelectedViewersStory(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-all">
                <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
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
                  <div key={v.userId} className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                    <img src={`https://picsum.photos/seed/${v.userId}/200`} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate text-slate-900 dark:text-white">{v.userName}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg uppercase tracking-widest">Seen</div>
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
