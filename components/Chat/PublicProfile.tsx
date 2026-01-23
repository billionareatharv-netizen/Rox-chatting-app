
import React, { useState, useEffect } from 'react';
import { User, Message } from '../../types';
import { blockUser, unblockUser, auth, getMessages, setNickname } from '../../firebase';

interface PublicProfileProps {
  user: User;
  onClose: () => void;
  onCallStart?: (user: User, type: 'voice' | 'video') => void;
  nickname?: string; // Feature 3
}

export const PublicProfile: React.FC<PublicProfileProps> = ({ user, onClose, onCallStart, nickname: initialNickname }) => {
  const currentUser = auth.currentUser;
  const [isBlocked, setIsBlocked] = useState(currentUser?.blockedUsers?.includes(user.uid) || false);
  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaCount, setMediaCount] = useState(0);
  
  // Nickname State
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(initialNickname || '');

  useEffect(() => {
    const fetchMediaCount = async () => {
      const chatId = [currentUser.uid, user.uid].sort().join('_');
      const msgs = await getMessages(chatId);
      const media = msgs.filter((m: Message) => m.type === 'image' || m.type === 'video');
      setMediaCount(media.length);
    };
    fetchMediaCount();
  }, [user.uid, currentUser.uid]);

  const handleToggleBlock = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      if (isBlocked) {
        await unblockUser(currentUser.uid, user.uid);
        setIsBlocked(false);
      } else {
        if (window.confirm(`Are you sure you want to block ${user.name}?`)) {
          await blockUser(currentUser.uid, user.uid);
          setIsBlocked(true);
        }
      }
    } catch (err) {
      alert("Failed to update block status.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNickname = async () => {
    if(!currentUser) return;
    await setNickname(currentUser.uid, user.uid, nicknameInput);
    setIsEditingNickname(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm lg:backdrop-blur-0 lg:bg-transparent" onClick={onClose}></div>
      
      <div className="relative w-full lg:max-w-md h-full bg-slate-50 dark:bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        <div className="h-16 flex items-center px-6 gap-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-600 dark:text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 className="text-lg font-bold">Contact Info</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="bg-white dark:bg-slate-900 px-6 py-10 flex flex-col items-center border-b border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative group mb-6">
              <img 
                src={user.photoURL} 
                className="w-48 h-48 rounded-full object-cover shadow-xl ring-4 ring-indigo-500/10 cursor-zoom-in transition-transform hover:scale-105" 
                alt={user.name} 
              />
              <div className={`absolute bottom-3 right-3 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 ${user.status === 'online' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
            </div>
            
            {/* Nickname / Name Logic */}
            {isEditingNickname ? (
                <div className="flex flex-col items-center gap-2 mb-4 w-full px-8">
                    <input 
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        placeholder="Set Nickname"
                        className="w-full text-center bg-slate-100 dark:bg-slate-800 p-2 rounded-xl font-bold"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditingNickname(false)} className="text-xs font-bold text-slate-400 uppercase">Cancel</button>
                        <button onClick={handleSaveNickname} className="text-xs font-bold text-indigo-500 uppercase">Save</button>
                    </div>
                </div>
            ) : (
                <div className="text-center mb-1 relative group cursor-pointer" onClick={() => setIsEditingNickname(true)}>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
                        {nicknameInput || user.name}
                        <svg className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </h3>
                    {nicknameInput && <p className="text-xs text-slate-400 font-medium">Original: {user.name}</p>}
                </div>
            )}
            
            {/* Feature 2: Privacy - Hiding Email, replacing with status */}
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {user.bio || 'App User'}
            </p>

            <div className="flex items-center gap-6">
               <button 
                  onClick={() => onCallStart?.(user, 'voice')}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Audio</span>
               </button>
               <button 
                  onClick={() => onCallStart?.(user, 'video')}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Video</span>
               </button>
            </div>
          </div>

          <div className="mt-3 bg-white dark:bg-slate-900 px-6 py-5 border-y border-slate-200 dark:border-slate-800 shadow-sm">
             <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">About</h4>
             <p className="text-slate-800 dark:text-slate-100 font-medium leading-relaxed">{user.bio || "No status available"}</p>
             <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{new Date(user.lastSeen).toLocaleDateString()}</p>
          </div>

          {/* ... Rest of settings (notifications, etc) ... */}
          
          <div className="mt-3 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 shadow-sm mb-20">
             <button 
              onClick={handleToggleBlock}
              disabled={loading}
              className="w-full px-6 py-4 flex items-center gap-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-b border-slate-100 dark:border-slate-800"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <span className="font-black text-sm uppercase tracking-widest">{isBlocked ? 'Unblock Contact' : 'Block Contact'}</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
