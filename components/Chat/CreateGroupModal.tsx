
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { getAllUsers, createGroup } from '../../firebase';
import { hasPremiumAccess, getBadgeIcon } from '../../premiumUtils';

interface CreateGroupModalProps {
  currentUser: User;
  onClose: () => void;
  onCreated: (chat: any) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ currentUser, onClose, onCreated }) => {
  const [mode, setMode] = useState<'single' | 'group'>('single');
  const [name, setName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Premium Limit Logic
  const hasLimitBoost = hasPremiumAccess(currentUser, 'group_limit_boost');
  const MEMBER_LIMIT = hasLimitBoost ? 250 : 20;

  useEffect(() => {
    getAllUsers().then(all => setUsers(all.filter(u => u.uid !== currentUser.uid)));
  }, [currentUser.uid]);

  const handleToggle = (uid: string) => {
    if (mode === 'single') return; 
    
    if (selected.includes(uid)) {
        setSelected(prev => prev.filter(id => id !== uid));
    } else {
        if (selected.length >= MEMBER_LIMIT) {
            alert(hasLimitBoost ? "Maximum group size reached." : "Upgrade to Premium to add more members!");
            return;
        }
        setSelected(prev => [...prev, uid]);
    }
  };

  const handleCreateGroup = async () => {
    if (!name.trim() || selected.length === 0) return;
    setLoading(true);
    const group = await createGroup(name.trim(), selected, currentUser.uid);
    onCreated(group);
    onClose();
  };

  const handleStartSingleChat = (user: User) => {
    // Determine chat ID deterministically
    const chatId = [currentUser.uid, user.uid].sort().join('_');
    const chat = {
      id: chatId,
      type: 'private',
      participants: [currentUser.uid, user.uid],
      updatedAt: Date.now(),
      lockedBy: []
    };
    onCreated(chat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">{mode === 'group' ? 'New Group' : 'New Message'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
          {mode === 'single' ? (
             <button 
               onClick={() => setMode('group')}
               className="w-full flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all font-bold group"
             >
                <div className="p-2 bg-indigo-500 rounded-full text-white group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                </div>
                <div className="text-left">
                    <span className="block">Create New Group</span>
                    {!hasLimitBoost && <span className="text-[10px] text-slate-400 font-normal">Limit: 20 Members</span>}
                    {hasLimitBoost && <span className="text-[10px] text-amber-500 font-bold">Premium Limit: 250 Members 👑</span>}
                </div>
             </button>
          ) : (
            <div className="animate-in slide-in-from-right">
              <input 
                type="text" 
                placeholder="Group Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3 outline-none ring-2 ring-transparent focus:ring-indigo-500/30 transition-all font-semibold mb-2"
              />
              <div className="flex justify-between items-center mb-2">
                  <button onClick={() => setMode('single')} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    &larr; Back to users
                  </button>
                  <span className={`text-xs font-bold ${selected.length >= MEMBER_LIMIT ? 'text-red-500' : 'text-slate-400'}`}>
                      {selected.length} / {MEMBER_LIMIT}
                  </span>
              </div>
            </div>
          )}
          
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">
            {mode === 'group' ? 'Select Participants' : 'All Contacts'}
          </h4>
          
          <div className="overflow-y-auto space-y-2 flex-1 pr-2 no-scrollbar">
            {users.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                    No other users found. Invite your friends!
                </div>
            ) : (
                users.map(u => (
                <div 
                    key={u.uid} 
                    onClick={() => mode === 'group' ? handleToggle(u.uid) : handleStartSingleChat(u)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${selected.includes(u.uid) && mode === 'group' ? 'bg-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                    <img src={u.photoURL} className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                        <span className="flex items-center gap-1 font-medium truncate">
                            {u.name}
                            {u.subscription?.isActive && <span className="text-[10px]">{getBadgeIcon(u.subscription.plan)}</span>}
                            {u.isAdmin && <span>🛡️</span>}
                        </span>
                        {mode === 'single' && <span className="text-[10px] opacity-60 uppercase tracking-wider">{u.status}</span>}
                    </div>
                    {mode === 'group' && selected.includes(u.uid) && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    )}
                </div>
                ))
            )}
          </div>
        </div>

        {mode === 'group' && (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-b-[2.5rem]">
            <button 
                onClick={handleCreateGroup}
                disabled={!name.trim() || selected.length === 0 || loading}
                className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
                {loading ? 'Creating...' : `Create Group (${selected.length})`}
            </button>
            </div>
        )}
      </div>
    </div>
  );
};
