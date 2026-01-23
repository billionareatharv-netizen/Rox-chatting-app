
import React, { useState, useEffect, useRef } from 'react';
import { User, Chat } from '../../types';
import { getUserById, leaveGroup, makeGroupAdmin, removeGroupMember, updateGroupInfo, addMembersToGroup, getAllUsers } from '../../firebase';

interface GroupInfoModalProps {
  chat: Chat;
  currentUser: User;
  onClose: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ chat, currentUser, onClose }) => {
  const [participants, setParticipants] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(chat.name || '');
  const [groupDescription, setGroupDescription] = useState(chat.description || '');
  const [groupPhoto, setGroupPhoto] = useState(chat.groupIcon || '');
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feature 1: Add Member State
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);

  useEffect(() => {
    const loadParticipants = async () => {
      const users = await Promise.all(chat.participants.map(uid => getUserById(uid)));
      setParticipants(users.filter(u => u !== null) as User[]);
    };
    loadParticipants();
    setIsAdmin(chat.adminIds?.includes(currentUser.uid) || false);
  }, [chat, currentUser.uid]);

  // Load users for adding (Feature 1)
  useEffect(() => {
    if (showAddMember) {
        getAllUsers().then(users => {
            const nonMembers = users.filter(u => !chat.participants.includes(u.uid));
            setAvailableUsers(nonMembers);
        });
    }
  }, [showAddMember, chat.participants]);

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
    await updateGroupInfo(chat.id, groupName, groupPhoto, groupDescription);
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

  const handleAddSelected = async () => {
    if(selectedToAdd.length === 0) return;
    await addMembersToGroup(chat.id, selectedToAdd, currentUser.name);
    setShowAddMember(false);
    // Reload participants
    const users = await Promise.all([...chat.participants, ...selectedToAdd].map(uid => getUserById(uid)));
    setParticipants(users.filter(u => u !== null) as User[]);
  };

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        <div className="h-16 flex items-center px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
            <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Group Info</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Group Profile */}
          <div className="flex flex-col items-center p-8 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative group mb-6">
              <img src={groupPhoto || `https://picsum.photos/seed/${chat.id}/200`} className="w-32 h-32 rounded-[2.5rem] object-cover shadow-2xl ring-4 ring-slate-50 dark:ring-slate-800" alt="" />
              {isEditing && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-[2.5rem] flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} className="hidden" accept="image/*" />
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-4 w-full">
                <input 
                  value={groupName} 
                  onChange={e => setGroupName(e.target.value)} 
                  className="w-full bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none font-bold text-center text-lg"
                  placeholder="Group Name"
                />
                <textarea 
                  value={groupDescription} 
                  onChange={e => setGroupDescription(e.target.value)} 
                  className="w-full bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none text-sm font-medium resize-none min-h-[80px]"
                  placeholder="Group Description"
                />
                <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold text-xs text-slate-500">Cancel</button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20">Save Changes</button>
                </div>
              </div>
            ) : (
              <div className="text-center w-full">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{chat.name}</h3>
                <p className="text-slate-500 text-sm font-medium mt-1 mb-4">{participants.length} participants</p>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl text-left border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">Description</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{chat.description || "No description provided."}</p>
                </div>
              </div>
            )}

            {isAdmin && !isEditing && (
               <button onClick={() => setIsEditing(true)} className="mt-6 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all border border-indigo-100 dark:border-indigo-900/20">
                 Edit Settings
               </button>
            )}
          </div>

          {/* Feature 1: Add Member Logic */}
          {showAddMember ? (
              <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
                  <h4 className="text-sm font-bold mb-3 flex items-center justify-between">
                      <span>Add Members</span>
                      <button onClick={() => setShowAddMember(false)} className="text-xs text-slate-400 uppercase font-bold">Cancel</button>
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                      {availableUsers.map(u => (
                          <div 
                            key={u.uid} 
                            onClick={() => setSelectedToAdd(prev => prev.includes(u.uid) ? prev.filter(id => id !== u.uid) : [...prev, u.uid])}
                            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer ${selectedToAdd.includes(u.uid) ? 'bg-indigo-500 text-white' : 'hover:bg-white dark:hover:bg-slate-800'}`}
                          >
                              <img src={u.photoURL} className="w-8 h-8 rounded-full" alt="" />
                              <span className="text-sm font-bold truncate">{u.name}</span>
                          </div>
                      ))}
                      {availableUsers.length === 0 && <p className="text-xs text-slate-400 italic">No other users available to add.</p>}
                  </div>
                  <button 
                    onClick={handleAddSelected}
                    disabled={selectedToAdd.length === 0}
                    className="w-full py-2 bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50"
                  >
                      Confirm Add ({selectedToAdd.length})
                  </button>
              </div>
          ) : (
            isAdmin && (
                <div className="px-6 pt-6">
                    <button onClick={() => setShowAddMember(true)} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                        Add Participants
                    </button>
                </div>
            )
          )}

          {/* Participants */}
          <div className="p-6">
            <div className="flex items-center justify-between px-2 mb-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Members</h4>
                <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500">{participants.length}</div>
            </div>
            
            <div className="space-y-2">
              {participants.map(user => {
                const isUserAdmin = chat.adminIds?.includes(user.uid);
                const isMe = user.uid === currentUser.uid;

                return (
                  <div key={user.uid} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <img src={user.photoURL} className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-slate-800" alt="" />
                      <div>
                        <p className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          {isMe ? 'You' : user.name}
                          {isUserAdmin && <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded border border-green-200 font-bold uppercase">Admin</span>}
                        </p>
                        {/* Feature 2: Hide Email */}
                        <p className="text-[10px] text-slate-400 font-medium">@{user.uid.slice(0,8)}</p>
                      </div>
                    </div>

                    {isAdmin && !isMe && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isUserAdmin && (
                          <button onClick={() => handleMakeAdmin(user.uid)} title="Make Admin" className="p-2 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-100 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          </button>
                        )}
                        <button onClick={() => handleRemoveMember(user.uid)} title="Remove" className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 pt-0">
            <button 
              onClick={handleLeaveGroup}
              className="w-full py-4 flex items-center justify-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-2xl font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-all border border-red-100 dark:border-red-900/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Exit Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
