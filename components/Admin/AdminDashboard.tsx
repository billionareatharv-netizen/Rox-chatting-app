
import React, { useState, useEffect } from 'react';
import { User, Chat, Message, StoreItem, UserRole } from '../../types';
import { 
  admin_getAllUsers, 
  admin_toggleGlobalBlock, 
  admin_deleteUser, 
  admin_getStats,
  admin_toggleAdminAccess,
  signOut,
  getMyChats,
  getMessages,
  getUserById,
  admin_getStoreItems,
  admin_addStoreItem,
  admin_deleteStoreItem
} from '../../firebase';
import { MessageBubble } from '../Chat/MessageBubble'; // Reuse
import { ROLE_STYLES } from '../../premiumUtils';

interface AdminDashboardProps {
  currentUser: User;
  onExit: () => void;
}

type AdminView = 'users' | 'store' | 'spy';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onExit }) => {
  const [activeView, setActiveView] = useState<AdminView>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ users: 0, messages: 0, chats: 0, stories: 0 });
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Spy State
  const [spyTarget, setSpyTarget] = useState<User | null>(null);
  const [spyChats, setSpyChats] = useState<Chat[]>([]);
  const [spyActiveChat, setSpyActiveChat] = useState<Chat | null>(null);
  const [spyMessages, setSpyMessages] = useState<Message[]>([]);

  // Store Form State
  const [newItem, setNewItem] = useState<Partial<StoreItem>>({ type: 'decoration', price: 99 });

  const refreshData = async () => {
    setIsLoading(true);
    const [allUsers, systemStats, items] = await Promise.all([
      admin_getAllUsers(),
      admin_getStats(),
      admin_getStoreItems()
    ]);
    setUsers(allUsers);
    setStats(systemStats);
    setStoreItems(items);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- SPY LOGIC ---
  const handleSpyOnUser = async (user: User) => {
      setSpyTarget(user);
      setActiveView('spy');
      const chats = await getMyChats(user.uid);
      setSpyChats(chats);
      setSpyActiveChat(null);
  };

  const handleSelectSpyChat = async (chat: Chat) => {
      setSpyActiveChat(chat);
      // Pass true for viewingAsAdmin to bypass privacy filters in getMessages
      const msgs = await getMessages(chat.id, true);
      setSpyMessages(msgs);
  };

  // --- ROLE MANAGEMENT ---
  const handleRoleChange = async (uid: string, currentRole: UserRole) => {
      if (currentUser.role !== 'owner' && currentUser.role !== 'co_admin') {
          alert("Only Owner and Co-Admins can manage roles.");
          return;
      }
      
      const roles: UserRole[] = ['user', 'admin', 'co_admin'];
      if (currentUser.role === 'owner') roles.push('owner'); // Only owner can make owners (unlikely but safe)

      // Simple cycle or prompt. Let's toggle Admin <-> Co-Admin <-> User
      // Implementation relies on existing firebase.ts `admin_toggleAdminAccess` which cycles
      await admin_toggleAdminAccess(uid);
      refreshData();
  };

  // --- STORE MANAGEMENT ---
  const handleAddStoreItem = async () => {
      if (!newItem.name || !newItem.value) return;
      await admin_addStoreItem(newItem as StoreItem);
      setNewItem({ type: 'decoration', price: 99, name: '', value: '', category: '' });
      refreshData();
  };

  const handleDeleteItem = async (id: string) => {
      if(confirm("Delete item?")) {
          await admin_deleteStoreItem(id);
          refreshData();
      }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
            <h1 className={`text-xl font-black ${ROLE_STYLES[currentUser.role]?.text || 'text-white'}`}>
                {currentUser.role.toUpperCase()} PANEL
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">System Control v3.0</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            <NavBtn label="User Database" icon="👥" active={activeView === 'users'} onClick={() => { setActiveView('users'); setSpyTarget(null); }} />
            <NavBtn label="Store Manager" icon="🛍️" active={activeView === 'store'} onClick={() => setActiveView('store')} />
            {spyTarget && <NavBtn label={`Spying: ${spyTarget.name}`} icon="🕵️" active={activeView === 'spy'} onClick={() => {}} className="animate-pulse text-red-400 bg-red-900/10" />}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-2">
            <button onClick={onExit} className="w-full py-3 rounded-xl border border-slate-700 hover:bg-slate-800 font-bold text-xs uppercase tracking-widest transition-all">Exit to App</button>
            <button onClick={() => signOut()} className="w-full py-3 rounded-xl bg-red-900/20 text-red-500 hover:bg-red-900/40 font-bold text-xs uppercase tracking-widest transition-all">Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950 relative">
          
          {/* USERS VIEW */}
          {activeView === 'users' && (
              <div className="flex-1 overflow-y-auto p-8">
                  <div className="grid grid-cols-4 gap-6 mb-8">
                      <StatBox label="Total Users" value={stats.users} color="blue" />
                      <StatBox label="Messages" value={stats.messages} color="green" />
                      <StatBox label="Groups" value={stats.chats} color="purple" />
                      <StatBox label="Revenue" value={"₹" + (users.filter(u=>u.subscription?.isActive).length * 499)} color="amber" />
                  </div>

                  <div className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              <tr>
                                  <th className="px-6 py-4">User</th>
                                  <th className="px-6 py-4">Role</th>
                                  <th className="px-6 py-4">Status</th>
                                  <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                              {users.map(u => (
                                  <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors">
                                      <td className="px-6 py-4 flex items-center gap-3">
                                          <img src={u.photoURL} className="w-10 h-10 rounded-xl" alt="" />
                                          <div>
                                              <p className="font-bold text-sm">{u.name}</p>
                                              <p className="text-[10px] text-slate-500">{u.email}</p>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${ROLE_STYLES[u.role || (u.isAdmin?'admin':'user')].badge || 'bg-slate-800 text-slate-400'}`}>
                                              {u.role || (u.isAdmin ? 'ADMIN' : 'USER')}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                              <div className={`w-2 h-2 rounded-full ${u.isGloballyBlocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                              <span className="text-xs font-bold text-slate-400">{u.isGloballyBlocked ? 'BANNED' : 'ACTIVE'}</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                                          <button onClick={() => handleSpyOnUser(u)} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500 hover:text-white transition-all" title="Spy Chat">🕵️</button>
                                          <button onClick={() => handleRoleChange(u.uid, u.role)} className="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500 hover:text-white transition-all" title="Promote/Demote">⬆️</button>
                                          <button onClick={() => admin_toggleGlobalBlock(u.uid).then(refreshData)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all" title="Ban">🚫</button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* STORE VIEW */}
          {activeView === 'store' && (
              <div className="flex-1 overflow-y-auto p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Add Form */}
                      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 h-fit">
                          <h3 className="text-xl font-bold mb-6">Add Item</h3>
                          <div className="space-y-4">
                              <select 
                                value={newItem.type} 
                                onChange={e => setNewItem({...newItem, type: e.target.value as any})}
                                className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800"
                              >
                                  <option value="decoration">Decoration</option>
                                  <option value="animation">Effect</option>
                                  <option value="badge">Badge</option>
                              </select>
                              <input placeholder="Item Name" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800" />
                              <input placeholder="Price (INR)" type="number" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800" />
                              <input placeholder="Preview (Emoji/URL)" value={newItem.previewUrl || ''} onChange={e => setNewItem({...newItem, previewUrl: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800" />
                              <input placeholder="Value (CSS Class/ID)" value={newItem.value || ''} onChange={e => setNewItem({...newItem, value: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800" />
                              <input placeholder="Category" value={newItem.category || ''} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800" />
                              <button onClick={handleAddStoreItem} className="w-full py-3 bg-green-600 rounded-xl font-bold">Add to Store</button>
                          </div>
                      </div>

                      {/* Items List */}
                      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                          {storeItems.map(item => (
                              <div key={item.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 relative group">
                                  <div className="text-3xl mb-2">{item.previewUrl}</div>
                                  <h4 className="font-bold">{item.name}</h4>
                                  <p className="text-xs text-slate-500">{item.category}</p>
                                  <p className="font-mono text-green-400 mt-2">₹{item.price}</p>
                                  <button onClick={() => handleDeleteItem(item.id)} className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* SPY VIEW */}
          {activeView === 'spy' && spyTarget && (
              <div className="flex h-full">
                  {/* Spy Sidebar */}
                  <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
                      <div className="p-4 border-b border-slate-800 bg-red-900/10">
                          <h3 className="font-bold text-red-400 flex items-center gap-2">
                              🕵️ Spying on: {spyTarget.name}
                          </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                          {spyChats.map(chat => (
                              <div 
                                key={chat.id} 
                                onClick={() => handleSelectSpyChat(chat)}
                                className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800 ${spyActiveChat?.id === chat.id ? 'bg-slate-800' : ''}`}
                              >
                                  <p className="font-bold text-sm truncate">{chat.type === 'group' ? chat.name : 'Private Chat'}</p>
                                  <p className="text-xs text-slate-500">{chat.id}</p>
                              </div>
                          ))}
                      </div>
                  </div>
                  
                  {/* Spy Chat Area */}
                  <div className="flex-1 bg-slate-950 flex flex-col">
                      {spyActiveChat ? (
                          <>
                              <div className="h-16 border-b border-slate-800 flex items-center px-6">
                                  <span className="font-bold text-lg">Monitoring Chat: {spyActiveChat.id}</span>
                              </div>
                              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                  {spyMessages.map(msg => (
                                      <div key={msg.id} className={`flex ${msg.senderId === spyTarget.uid ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[70%] p-3 rounded-xl ${msg.senderId === spyTarget.uid ? 'bg-indigo-900/50 border border-indigo-500/30' : 'bg-slate-800'}`}>
                                              <p className="text-xs text-slate-400 mb-1">{msg.senderId}</p>
                                              <p>{msg.text}</p>
                                              {msg.fileUrl && <span className="text-xs text-blue-400">[Media Attachment]</span>}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </>
                      ) : (
                          <div className="flex-1 flex items-center justify-center text-slate-600">Select a chat to inspect</div>
                      )}
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};

const NavBtn = ({ label, icon, active, onClick, className = '' }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'} ${className}`}
    >
        <span>{icon}</span>
        <span className="font-bold text-sm">{label}</span>
    </button>
);

const StatBox = ({ label, value, color }: any) => (
    <div className={`p-6 bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden`}>
        <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{label}</h4>
        <p className="text-3xl font-black text-white">{value}</p>
        <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${color}-500/20 blur-[40px] rounded-full`}></div>
    </div>
);
