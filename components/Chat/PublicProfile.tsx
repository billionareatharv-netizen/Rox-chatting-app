
import React, { useState, useEffect } from 'react';
import { User, Message } from '../../types';
import { blockUser, unblockUser, auth, getMessages } from '../../firebase';

interface PublicProfileProps {
  user: User;
  onClose: () => void;
  onCallStart?: (user: User, type: 'voice' | 'video') => void;
}

export const PublicProfile: React.FC<PublicProfileProps> = ({ user, onClose, onCallStart }) => {
  const currentUser = auth.currentUser;
  const [isBlocked, setIsBlocked] = useState(currentUser?.blockedUsers?.includes(user.uid) || false);
  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaCount, setMediaCount] = useState(0);

  useEffect(() => {
    // Mock media count by checking messages for this user
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

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm lg:backdrop-blur-0 lg:bg-transparent" onClick={onClose}></div>
      
      {/* Main Panel */}
      <div className="relative w-full lg:max-w-md h-full bg-slate-50 dark:bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header (Sticky-ish) */}
        <div className="h-16 flex items-center px-6 gap-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-600 dark:text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 className="text-lg font-bold">Contact Info</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Hero Section */}
          <div className="bg-white dark:bg-slate-900 px-6 py-10 flex flex-col items-center border-b border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative group mb-6">
              <img 
                src={user.photoURL} 
                className="w-48 h-48 rounded-full object-cover shadow-xl ring-4 ring-indigo-500/10 cursor-zoom-in transition-transform hover:scale-105" 
                alt={user.name} 
              />
              <div className={`absolute bottom-3 right-3 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 ${user.status === 'online' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-1">{user.name}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">{user.email}</p>

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
               <button 
                  className="flex flex-col items-center gap-2 group"
                  onClick={onClose}
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-all shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Search</span>
               </button>
            </div>
          </div>

          {/* About Section */}
          <div className="mt-3 bg-white dark:bg-slate-900 px-6 py-5 border-y border-slate-200 dark:border-slate-800 shadow-sm">
             <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">About</h4>
             <p className="text-slate-800 dark:text-slate-100 font-medium leading-relaxed">{user.bio || "No status available"}</p>
             <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{new Date(user.lastSeen).toLocaleDateString()}</p>
          </div>

          {/* Media Links Section */}
          <div className="mt-3 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 shadow-sm">
             <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                   </div>
                   <span className="font-bold text-sm">Media, Links, and Docs</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-slate-400">{mediaCount}</span>
                   <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                </div>
             </button>
          </div>

          {/* Settings Section */}
          <div className="mt-3 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
             <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setIsMuted(!isMuted)}>
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                   </div>
                   <span className="font-bold text-sm">Mute notifications</span>
                </div>
                <div className={`w-10 h-5 rounded-full transition-all relative ${isMuted ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                   <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isMuted ? 'left-6' : 'left-1'}`}></div>
                </div>
             </div>
             <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                   <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                   </div>
                   <span className="font-bold text-sm">Custom notifications</span>
                </div>
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
             </button>
             <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                   <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                   </div>
                   <span className="font-bold text-sm">Encryption</span>
                </div>
                <div className="flex items-center gap-1">
                   <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"/></svg>
                </div>
             </button>
          </div>

          {/* Block/Report Section */}
          <div className="mt-3 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 shadow-sm mb-20">
             <button 
              onClick={handleToggleBlock}
              disabled={loading}
              className="w-full px-6 py-4 flex items-center gap-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-b border-slate-100 dark:border-slate-800"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <span className="font-black text-sm uppercase tracking-widest">{isBlocked ? 'Unblock Contact' : 'Block Contact'}</span>
             </button>
             <button className="w-full px-6 py-4 flex items-center gap-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="font-black text-sm uppercase tracking-widest">Report Contact</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
