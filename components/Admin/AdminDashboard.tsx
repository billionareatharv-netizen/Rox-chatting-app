
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
      setIsMobileMenuOpen(false);
      const chats = await getMyChats(user.uid);
      setSpyChats(chats);
      setSpyActiveChat(null);
  };

  const handleSelectSpyChat = async (chat: Chat) => {
      setSpyActiveChat(chat);
      const msgs = await getMessages(chat.id, true);
      setSpyMessages(msgs);
  };

  // --- ROLE MANAGEMENT ---
  const handleRoleChange = async (uid: string) => {
      if (currentUser.role !== 'owner' && currentUser.role !== 'co_admin') {
          alert("Only Owner and Co-Admins can manage roles.");
          return;
      }
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

  const NavItem = ({ label, icon, view }: { label: string, icon: string, view: AdminView }) => (
    <button 
        onClick={() => { setActiveView(view); setSpyTarget(null); setIsMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeView === view ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
        <span className="text-xl">{icon}</span>
        <span className="font-bold text-sm uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-50 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
              <span className="text-2xl">{ROLE_STYLES[currentUser.role]?.icon}</span>
              <span className="font-black text-white tracking-widest">ADMIN PANEL</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-white bg-slate-800 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
          </button>
      </div>

      {/* Sidebar (Desktop & Mobile Overlay) */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 z-40 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 h-20 hidden lg:flex flex-col justify-center">
            <h1 className={`text-xl font-black ${ROLE_STYLES[currentUser.role]?.text || 'text-white'}`}>
                {currentUser.role.toUpperCase()} PANEL
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">System Control v3.0</p>
        </div>
        <div className="lg:hidden h-20"></div> {/* Spacer for mobile header */}
        
        <nav className="flex-1 p-4 space-y-2">
            <NavItem label="Database" icon="👥" view="users" />
            <NavItem label="Store" icon="🛍️" view="store" />
            {spyTarget && (
                <button 
                    onClick={() => { setActiveView('spy'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all bg-red-900/20 text-red-400 border border-red-900/50 animate-pulse`}
                >
                    <span className="text-xl">🕵️</span>
                    <span className="font-bold text-sm uppercase tracking-wider truncate">Spy: {spyTarget.name.split(' ')[0]}</span>
                </button>
            )}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-3">
            <button onClick={onExit} className="w-full py-3 rounded-xl border border-slate-700 hover:bg-slate-800 font-bold text-xs uppercase tracking-widest transition-all">Exit to App</button>
            <button onClick={() => signOut()} className="w-full py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-900/20">Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950 relative pt-16 lg:pt-0">
          
          {/* USERS VIEW */}
          {activeView === 'users' && (
              <div className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <StatBox label="Total Users" value={stats.users} color="blue" />
                      <StatBox label="Messages" value={stats.messages} color="green" />
                      <StatBox label="Groups" value={stats.chats} color="purple" />
                      <StatBox label="Revenue" value={"₹" + (users.filter(u=>u.subscription?.isActive).length * 499)} color="amber" />
                  </div>

                  <div className="bg-slate-900/50 rounded-[2rem] border border-slate-800 overflow-hidden backdrop-blur-sm">
                      {/* Desktop Table */}
                      <div className="hidden md:block">
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
                                            <img src={u.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                            <div>
                                                <p className="font-bold text-sm text-white">{u.name}</p>
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
                                            <ActionButton onClick={() => handleSpyOnUser(u)} icon="🕵️" color="indigo" />
                                            <ActionButton onClick={() => handleRoleChange(u.uid)} icon="⬆️" color="amber" />
                                            <ActionButton onClick={() => admin_toggleGlobalBlock(u.uid).then(refreshData)} icon="🚫" color="red" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden p-4 space-y-4">
                          {users.map(u => (
                              <div key={u.uid} className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-lg">
                                  <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                          <img src={u.photoURL} className="w-12 h-12 rounded-full object-cover border-2 border-slate-600" alt="" />
                                          <div>
                                              <h4 className="font-bold text-white">{u.name}</h4>
                                              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${ROLE_STYLES[u.role || (u.isAdmin?'admin':'user')].badge || 'bg-slate-900 text-slate-400'}`}>
                                                  {u.role || (u.isAdmin ? 'ADMIN' : 'USER')}
                                              </span>
                                          </div>
                                      </div>
                                      <div className={`w-3 h-3 rounded-full ${u.isGloballyBlocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                  </div>
                                  <div className="flex gap-2 border-t border-slate-700 pt-4">
                                      <button onClick={() => handleSpyOnUser(u)} className="flex-1 py-2 bg-indigo-600/20 text-indigo-400 rounded-lg text-xs font-bold uppercase hover:bg-indigo-600 hover:text-white transition-colors">Spy Chat</button>
                                      <button onClick={() => handleRoleChange(u.uid)} className="flex-1 py-2 bg-amber-600/20 text-amber-400 rounded-lg text-xs font-bold uppercase hover:bg-amber-600 hover:text-white transition-colors">Role</button>
                                      <button onClick={() => admin_toggleGlobalBlock(u.uid).then(refreshData)} className="flex-1 py-2 bg-red-600/20 text-red-400 rounded-lg text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition-colors">Ban</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* STORE VIEW */}
          {activeView === 'store' && (
              <div className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar">
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                      {/* Add Form */}
                      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 h-fit shadow-xl">
                          <h3 className="text-xl font-bold mb-6 text-white">Add New Item</h3>
                          <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item Type</label>
                                <select 
                                    value={newItem.type} 
                                    onChange={e => setNewItem({...newItem, type: e.target.value as any})}
                                    className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none focus:border-indigo-500 transition-colors"
                                >
                                    <option value="decoration">Decoration</option>
                                    <option value="animation">Effect</option>
                                    <option value="badge">Badge</option>
                                </select>
                              </div>
                              <input placeholder="Item Name" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none focus:border-indigo-500" />
                              <input placeholder="Price (INR)" type="number" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none focus:border-indigo-500" />
                              <input placeholder="Preview (Emoji/URL)" value={newItem.previewUrl || ''} onChange={e => setNewItem({...newItem, previewUrl: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none focus:border-indigo-500" />
                              <input placeholder="Value (CSS Class/ID)" value={newItem.value || ''} onChange={e => setNewItem({...newItem, value: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none focus:border-indigo-500" />
                              <input placeholder="Category" value={newItem.category || ''} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none focus:border-indigo-500" />
                              <button onClick={handleAddStoreItem} className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-green-900/20 active:scale-95">Add to Store</button>
                          </div>
                      </div>

                      {/* Items List */}
                      <div className="xl:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {storeItems.map(item => (
                              <div key={item.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 relative group hover:border-indigo-500 transition-all">
                                  <div className="aspect-square bg-slate-950 rounded-xl mb-3 flex items-center justify-center text-4xl shadow-inner relative overflow-hidden">
                                      {item.type === 'decoration' && <div className={`w-full h-full border-4 ${item.value}`}></div>}
                                      <span className="relative z-10">{item.previewUrl}</span>
                                  </div>
                                  <h4 className="font-bold text-white truncate">{item.name}</h4>
                                  <div className="flex justify-between items-center mt-1">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.category}</p>
                                    <p className="font-mono text-green-400 text-xs font-bold">₹{item.price}</p>
                                  </div>
                                  <button onClick={() => handleDeleteItem(item.id)} className="absolute top-2 right-2 p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* SPY VIEW */}
          {activeView === 'spy' && spyTarget && (
              <div className="flex h-full flex-col lg:flex-row">
                  {/* Spy Sidebar - Desktop */}
                  <div className="hidden lg:flex w-72 bg-slate-900 border-r border-slate-800 flex-col">
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
                                  <p className="font-bold text-sm truncate text-white">{chat.type === 'group' ? chat.name : 'Private Chat'}</p>
                                  <p className="text-xs text-slate-500">{chat.id}</p>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Spy Sidebar - Mobile (Dropdown) */}
                  <div className="lg:hidden p-4 bg-slate-900 border-b border-slate-800">
                      <select 
                        className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800"
                        onChange={(e) => {
                            const chat = spyChats.find(c => c.id === e.target.value);
                            if (chat) handleSelectSpyChat(chat);
                        }}
                      >
                          <option value="">Select a Chat to Spy</option>
                          {spyChats.map(chat => (
                              <option key={chat.id} value={chat.id}>{chat.type === 'group' ? chat.name : chat.id}</option>
                          ))}
                      </select>
                  </div>
                  
                  {/* Spy Chat Area */}
                  <div className="flex-1 bg-slate-950 flex flex-col min-h-0">
                      {spyActiveChat ? (
                          <>
                              <div className="h-14 border-b border-slate-800 flex items-center px-6 bg-slate-900/50">
                                  <span className="font-bold text-sm text-slate-300">Monitoring: <span className="text-white">{spyActiveChat.type === 'group' ? spyActiveChat.name : 'Private'}</span></span>
                              </div>
                              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                  {spyMessages.map(msg => (
                                      <div key={msg.id} className={`flex ${msg.senderId === spyTarget.uid ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[85%] p-3 rounded-xl ${msg.senderId === spyTarget.uid ? 'bg-indigo-900/50 border border-indigo-500/30' : 'bg-slate-800 border border-slate-700'}`}>
                                              <p className="text-[10px] text-slate-400 mb-1 opacity-70">{msg.senderId}</p>
                                              <p className="text-sm text-white">{msg.text}</p>
                                              {msg.fileUrl && <span className="text-xs text-blue-400 mt-1 block">[Media Attachment]</span>}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </>
                      ) : (
                          <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-4">
                              <span className="text-4xl">👁️</span>
                              <p>Select a chat to inspect messages</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};

const ActionButton = ({ onClick, icon, color }: any) => (
    <button 
        onClick={onClick} 
        className={`w-8 h-8 flex items-center justify-center rounded-lg bg-${color}-500/10 text-${color}-400 hover:bg-${color}-500 hover:text-white transition-all`}
    >
        {icon}
    </button>
);

const StatBox = ({ label, value, color }: any) => (
    <div className={`p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden`}>
        <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</h4>
        <p className="text-2xl font-black text-white">{value}</p>
        <div className={`absolute -right-4 -bottom-4 w-20 h-20 bg-${color}-500/20 blur-[30px] rounded-full`}></div>
    </div>
);
