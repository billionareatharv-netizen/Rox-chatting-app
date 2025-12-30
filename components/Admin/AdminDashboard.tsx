
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { 
  admin_getAllUsers, 
  admin_toggleGlobalBlock, 
  admin_deleteUser, 
  admin_getStats,
  admin_toggleAdminAccess,
  signOut
} from '../../firebase';

interface AdminDashboardProps {
  currentUser: User;
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onExit }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ users: 0, messages: 0, chats: 0, stories: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    const [allUsers, systemStats] = await Promise.all([
      admin_getAllUsers(),
      admin_getStats()
    ]);
    setUsers(allUsers);
    setStats(systemStats);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleBlock = async (uid: string) => {
    await admin_toggleGlobalBlock(uid);
    refreshData();
  };

  const handleToggleAdmin = async (uid: string) => {
    if (window.confirm("Change administrative access for this user?")) {
      await admin_toggleAdminAccess(uid);
      refreshData();
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm("Are you sure you want to PERMANENTLY delete this user and all their data? This cannot be undone.")) {
      await admin_deleteUser(uid);
      refreshData();
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-sm uppercase tracking-tighter truncate">Command Center</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">v2.5 Security</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl border border-white/5">
          <img src={currentUser.photoURL} className="w-8 h-8 rounded-lg object-cover" alt="" />
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">{currentUser.name}</p>
            <p className="text-[9px] text-slate-500 font-medium">Administrator</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <button className="w-full flex items-center gap-3 p-3 bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
           User Manager
        </button>
        <button onClick={onExit} className="w-full flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl text-sm font-bold transition-all">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
           Chat View
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-bold transition-all"
        >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
           Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex w-64 border-r border-slate-800 bg-slate-900/50 flex-col shrink-0">
        <SidebarContent />
      </div>

      {/* Sidebar - Mobile Drawer */}
      <div className={`fixed inset-0 z-[250] lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
         <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)}></div>
         <div className={`absolute top-0 left-0 w-72 h-full bg-slate-900 shadow-2xl transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <SidebarContent />
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-4 lg:px-8 bg-slate-900/20 shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
             </button>
             <h2 className="text-lg lg:text-xl font-black tracking-tight truncate">System Overview</h2>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
             <div className="relative hidden md:block">
               <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
               </span>
               <input 
                type="text" 
                placeholder="Search Database..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-800/50 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all w-48 lg:w-64"
               />
             </div>
             <button onClick={refreshData} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all">
                <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             </button>
          </div>
        </header>

        {/* Mobile Search - Visible only on mobile below header */}
        <div className="p-4 md:hidden border-b border-slate-800 bg-slate-900/10">
            <div className="relative">
               <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
               </span>
               <input 
                type="text" 
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-xs outline-none"
               />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar">
          {/* Stats Grid - Responsive grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-10">
            <StatCard title="Global Users" value={stats.users} icon={<svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} color="indigo" />
            <StatCard title="Messages" value={stats.messages} icon={<svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>} color="green" />
            <StatCard title="Groups" value={stats.chats} icon={<svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} color="blue" />
            <StatCard title="Stories" value={stats.stories} icon={<svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>} color="pink" />
          </div>

          {/* User Table - Horizontal scrolling for small screens */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm lg:text-base">User Management</h3>
              <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-slate-400 font-bold uppercase tracking-widest">{filteredUsers.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-800/30 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Permissions</th>
                    <th className="px-6 py-4">Security Status</th>
                    <th className="px-6 py-4 text-right">Database Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredUsers.map(u => (
                    <tr key={u.uid} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" />
                          <div className="min-w-0 max-w-[150px]">
                            <p className="text-sm font-bold truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleToggleAdmin(u.uid)}
                          disabled={u.email === 'betterrroxx@gmail.com'}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${u.isAdmin ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                           <span className="text-[10px] font-black uppercase tracking-widest">{u.isAdmin ? 'Admin' : 'Grant Admin'}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${u.isGloballyBlocked ? 'bg-red-500 animate-pulse' : u.status === 'online' ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${u.isGloballyBlocked ? 'text-red-400' : 'text-slate-400'}`}>
                            {u.isGloballyBlocked ? 'Suspended' : u.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          {u.email !== 'betterrroxx@gmail.com' && (
                            <>
                              <button 
                                onClick={() => handleToggleBlock(u.uid)}
                                className={`p-2.5 rounded-xl transition-all ${u.isGloballyBlocked ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'}`}
                                title={u.isGloballyBlocked ? "Reinstate User" : "Suspend Access"}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.uid)}
                                className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all"
                                title="Wipe Account Data"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <p className="text-sm font-bold">No results found in the database.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string, value: number, icon: any, color: string }) => {
  const colorMap: any = {
    indigo: 'from-indigo-500/20 text-indigo-400 border-indigo-500/30',
    green: 'from-green-500/20 text-green-400 border-green-500/30',
    blue: 'from-blue-500/20 text-blue-400 border-blue-500/30',
    pink: 'from-pink-500/20 text-pink-400 border-pink-500/30',
  };

  return (
    <div className={`p-4 lg:p-6 bg-slate-900 border ${colorMap[color].split(' ')[2]} rounded-3xl bg-gradient-to-br ${colorMap[color].split(' ')[0]} transition-all hover:translate-y-[-2px] shadow-xl`}>
      <div className="flex items-center justify-between mb-2 lg:mb-4">
        <div className={`p-2 lg:p-3 bg-black/20 rounded-xl lg:rounded-2xl ${colorMap[color].split(' ')[1]}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl lg:text-3xl font-black mb-1 leading-none">{value}</p>
      <p className="text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none truncate">{title}</p>
    </div>
  );
};
