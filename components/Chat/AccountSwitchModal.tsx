import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { auth, signInWithEmailAndPassword } from '../../firebase';

interface AccountSwitchModalProps {
  currentUser: User;
  onClose: () => void;
}

export const AccountSwitchModal: React.FC<AccountSwitchModalProps> = ({ currentUser, onClose }) => {
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('roxx_accounts');
      if (stored) {
        const accounts = JSON.parse(stored);
        setSavedAccounts(accounts);
      }
    } catch (e) {
      console.error("Error loading accounts", e);
    }
  }, []);

  const handleSwitch = async (acc: any) => {
    if (acc.uid === currentUser.uid) return;
    
    setLoading(true);
    try {
      await auth.signOut();
      // Need to re-auth
      await signInWithEmailAndPassword(auth, acc.email, acc.pass);
      // Window reload happens via App's auth listener usually, or we can force reload to be safe
      window.location.reload();
    } catch (e) {
      alert("Failed to switch. Credentials might be outdated.");
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    // Save current user to list implicitly if possible (though AuthView handles the main save logic)
    // We confirm the user wants to log out.
    if (window.confirm("You will be logged out to create or sign in to a new account. Continue?")) {
        await auth.signOut();
        window.location.reload();
    }
  };

  // Filter accounts: Do not exclude current user from the list logic entirely, just from the 'switch to' view if desired.
  // Actually, showing all accounts is fine, but highlighting active.
  // The user requirement implies they switch BETWEEN accounts.
  
  const otherAccounts = savedAccounts.filter(a => a.uid !== currentUser.uid);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 animate-in zoom-in-95">
        <h3 className="text-xl font-black mb-6 text-center">Switch Account</h3>
        
        <div className="space-y-3 mb-6">
          {/* Current Account */}
          <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-500 rounded-2xl relative">
             <img src={currentUser.photoURL} className="w-10 h-10 rounded-full object-cover" alt="" />
             <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active</p>
             </div>
             <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>

          {/* Saved Accounts */}
          {otherAccounts.map(acc => (
             <button 
                key={acc.uid}
                onClick={() => handleSwitch(acc)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-transparent transition-all text-left"
             >
                <img src={acc.photoURL} className="w-10 h-10 rounded-full object-cover opacity-70 grayscale" alt="" />
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate text-slate-600 dark:text-slate-300">{acc.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Switch</p>
                </div>
                {loading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
             </button>
          ))}
        </div>

        {otherAccounts.length === 0 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl mb-6 text-center">
                <p className="text-sm font-bold text-slate-500">No other accounts saved.</p>
                <p className="text-xs text-slate-400 mt-1">Add a second account to switch quickly.</p>
            </div>
        )}

        <button 
            onClick={handleAddAccount}
            className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
        >
            {savedAccounts.length === 0 ? "Create 2nd Account" : "Add Another Account"}
        </button>
      </div>
    </div>
  );
};