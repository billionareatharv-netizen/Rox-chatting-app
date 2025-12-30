
import React, { useState, useEffect } from 'react';
import { AuthView } from './components/Auth/AuthView';
import { ChatDashboard } from './components/Chat/ChatDashboard';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { useAuth } from './hooks/useAuth';

type AppView = 'auth' | 'role_select' | 'user' | 'admin';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<AppView>('auth');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Handle initial view routing and transitions
  useEffect(() => {
    if (!user) {
      setView('auth');
    } else if (user.isAdmin) {
      // For admins, default to role selection unless they've already chosen a path
      if (view === 'auth') {
        setView('role_select');
      }
    } else {
      setView('user');
    }
  }, [user, view]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 animate-pulse font-medium text-sm">Initializing Secure Session...</p>
        </div>
      </div>
    );
  }

  // Guard: If no user, always show Auth
  if (!user) {
    return <AuthView />;
  }

  // Role Selection Screen for Admins
  if (view === 'role_select') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-black p-4">
        <div className="glass w-full max-w-lg p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-indigo-500/20 rounded-[2rem] flex items-center justify-center mb-8 border border-white/20">
              <svg className="w-10 h-10 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
           </div>
           <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Access Control</h1>
           <p className="text-slate-400 text-sm font-medium mb-10">Welcome back, {user.name}. Choose your workspace.</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <button 
                onClick={() => setView('user')}
                className="group relative p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white/10 transition-all text-left overflow-hidden"
              >
                 <div className="p-3 bg-white/10 rounded-2xl w-fit mb-4 group-hover:bg-indigo-500 transition-colors">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                 </div>
                 <h3 className="text-lg font-bold text-white mb-1">Normal User</h3>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Go to Chat Dashboard</p>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              </button>

              <button 
                onClick={() => setView('admin')}
                className="group relative p-8 bg-indigo-500/10 border border-indigo-500/30 rounded-[2.5rem] hover:bg-indigo-500/20 transition-all text-left overflow-hidden"
              >
                 <div className="p-3 bg-indigo-500 text-white rounded-2xl w-fit mb-4 shadow-lg shadow-indigo-500/40">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </div>
                 <h3 className="text-lg font-bold text-white mb-1">Admin Panel</h3>
                 <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">System Management</p>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              </button>
           </div>
        </div>
      </div>
    );
  }

  // Main Dashboard or Admin Panel
  return (
    <div className="h-screen overflow-hidden text-slate-900 dark:text-slate-100">
      {view === 'admin' ? (
        <AdminDashboard 
          currentUser={user} 
          onExit={() => setView('user')}
        />
      ) : (
        <div className="relative h-full">
           {user.isAdmin && (
             <button 
              onClick={() => setView('role_select')}
              className="fixed bottom-4 right-4 z-[200] bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 border border-white/20"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
               Switch Workspace
             </button>
           )}
           <ChatDashboard 
            currentUser={user} 
            toggleDarkMode={() => setDarkMode(!darkMode)} 
            isDarkMode={darkMode}
          />
        </div>
      )}
    </div>
  );
};

export default App;
