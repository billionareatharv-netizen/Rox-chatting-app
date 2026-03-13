
import React, { useState, useEffect, ReactNode } from 'react';
import { AuthView } from './components/Auth/AuthView';
import { ChatDashboard } from './components/Chat/ChatDashboard';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { LockScreen } from './components/Chat/LockScreen'; 
import { useAuth } from './hooks/useAuth';

type AppView = 'auth' | 'role_select' | 'user' | 'admin';

import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<AppView>('auth');
  const [isLocked, setIsLocked] = useState(false);
  const [lockPin, setLockPin] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches));

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); } 
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [darkMode]);

  useEffect(() => {
    const pin = localStorage.getItem('roxx_app_lock');
    if (pin) { setLockPin(pin); setIsLocked(true); }
  }, []);

  useEffect(() => {
    if (!user) setView('auth');
    else if (user.isAdmin && view === 'auth') setView('role_select');
    else if (view === 'auth') setView('user');
  }, [user, view]);

  if (loading) return <div className="h-screen w-full bg-slate-950 flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (isLocked && lockPin) return <LockScreen storedPin={lockPin} onUnlock={() => setIsLocked(false)} />;
  if (!user) return <AuthView />;

  if (view === 'role_select') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl text-center shadow-xl">
           <h1 className="text-2xl font-bold text-white mb-8">Select Workspace</h1>
           <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('user')} className="p-6 bg-indigo-600 rounded-2xl text-white font-bold hover:bg-indigo-500 transition-all">User App</button>
              <button onClick={() => setView('admin')} className="p-6 bg-slate-700 rounded-2xl text-white font-bold hover:bg-slate-600 transition-all border border-slate-600">Admin Panel</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-[100dvh] w-full overflow-hidden text-slate-900 dark:text-slate-100">
        {view === 'admin' ? (
          <AdminDashboard currentUser={user} onExit={() => setView('user')} />
        ) : (
          <div className="relative h-full w-full">
            {user.isAdmin && (
              <button 
                onClick={() => setView('role_select')}
                className="fixed bottom-24 right-4 z-[200] w-12 h-12 bg-slate-800 text-indigo-400 rounded-full shadow-2xl flex items-center justify-center border border-slate-700 hover:scale-110 transition-transform"
                title="Switch Workspace"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </button>
            )}
            <ChatDashboard currentUser={user} toggleDarkMode={() => setDarkMode(!darkMode)} isDarkMode={darkMode} />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
