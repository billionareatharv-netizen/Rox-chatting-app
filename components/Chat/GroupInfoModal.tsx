import React, { useState, useEffect, useRef } from 'react';
import { User, Chat } from '../../types';
import { getUserById, leaveGroup, makeGroupAdmin, removeGroupMember, updateGroupInfo } from '../../firebase';

interface GroupInfoModalProps {
  chat: Chat;
  currentUser: User;
  onClose: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ chat, currentUser, onClose }) => {
  const [participants, setParticipants] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(chat.name || '');
  const [groupPhoto, setGroupPhoto] = useState(chat.groupIcon || '');
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadParticipants = async () => {
      const users = await Promise.all(chat.participants.map(uid => getUserById(uid)));
      setParticipants(users.filter(u => u !== null) as User[]);
    };
    loadParticipants();
    setIsAdmin(chat.adminIds?.includes(currentUser.uid) || false);
  }, [chat, currentUser.uid]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setGroupPhoto(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!groupName.trim()) return;
    await updateGroupInfo(chat.id, groupName, groupPhoto);
    setIsEditing(false);
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      await leaveGroup(chat.id, currentUser.uid);
      onClose();
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (window.confirm("Remove this user from the group?")) {
      await removeGroupMember(chat.id, uid);
      setParticipants(prev => prev.filter(p => p.uid !== uid));
    }
  };

  const handleMakeAdmin = async (uid: string) => {
    if (window.confirm("Promote this user to Admin?")) {
      await makeGroupAdmin(chat.id, uid);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="h-16 flex items-center px-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 className="text-lg font-bold">Group Info</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Group Profile */}
          <div className="flex flex-col items-center p-8 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative group mb-4">
              <img src={groupPhoto || `https://picsum.photos/seed/${chat.id}/200`} className="w-32 h-32 rounded-full object-cover shadow-xl" alt="" />
              {isEditing && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} className="hidden" accept="image/*" />
            </div>

            {isEditing ? (
              <div className="flex gap-2 w-full max-w-xs">
                <input 
                  value={groupName} 
                  onChange={e => setGroupName(e.target.value)} 
                  className="flex-1 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl outline-none font-bold text-center"
                />
                <button onClick={handleSave} className="p-2 bg-green-500 text-white rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg></button>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-2xl font-black">{chat.name}</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">Group · {participants.length} participants</p>
              </div>
            )}

            {isAdmin && !isEditing && (
               <button onClick={() => setIsEditing(true)} className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                 Edit Group Settings
               </button>
            )}
          </div>

          {/* Participants */}
          <div className="p-4">
            <div className="flex items-center justify-between px-2 mb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{participants.length} Participants</h4>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            
            <div className="space-y-1">
              {participants.map(user => {
                const isUserAdmin = chat.adminIds?.includes(user.uid);
                const isMe = user.uid === currentUser.uid;

                return (
                  <div key={user.uid} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <img src={user.photoURL} className="w-10 h-10 rounded-full object-cover" alt="" />
                      <div>
                        <p className="text-sm font-bold flex items-center gap-2">
                          {isMe ? 'You' : user.name}
                          {isUserAdmin && <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded border border-green-200 font-bold uppercase">Admin</span>}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>

                    {isAdmin && !isMe && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isUserAdmin && (
                          <button onClick={() => handleMakeAdmin(user.uid)} title="Make Admin" className="p-2 bg-indigo-50 text-indigo-500 rounded-lg hover:bg-indigo-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          </button>
                        )}
                        <button onClick={() => handleRemoveMember(user.uid)} title="Remove" className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            <button 
              onClick={handleLeaveGroup}
              className="w-full py-4 flex items-center justify-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-2xl font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Exit Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};