
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { getAllUsers, createGroup } from '../../firebase';

interface CreateGroupModalProps {
  currentUser: User;
  onClose: () => void;
  onCreated: (chat: any) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ currentUser, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllUsers().then(all => setUsers(all.filter(u => u.uid !== currentUser.uid)));
  }, [currentUser.uid]);

  const handleToggle = (uid: string) => {
    setSelected(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) return;
    setLoading(true);
    const group = await createGroup(name.trim(), selected, currentUser.uid);
    onCreated(group);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">New Group</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <input 
            type="text" 
            placeholder="Group Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3 outline-none ring-2 ring-transparent focus:ring-indigo-500/30 transition-all font-semibold"
          />
          
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Participants</h4>
          <div className="overflow-y-auto space-y-2 max-h-60 pr-2">
            {users.map(u => (
              <div 
                key={u.uid} 
                onClick={() => handleToggle(u.uid)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${selected.includes(u.uid) ? 'bg-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <img src={u.photoURL} className="w-10 h-10 rounded-full object-cover" alt="" />
                <span className="flex-1 font-medium">{u.name}</span>
                {selected.includes(u.uid) && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-b-[2.5rem]">
          <button 
            onClick={handleCreate}
            disabled={!name.trim() || selected.length === 0 || loading}
            className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : `Create Group (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};
