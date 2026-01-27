
import React, { useState, useRef, useEffect } from 'react';
import { User, PremiumCustomization } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile, updatePremiumCustomization, safeJsonStringify } from '../../firebase';
import { hasPremiumAccess, getPlanDetails, ADMIN_STYLE } from '../../premiumUtils';
import { SubscriptionModal } from '../Premium/SubscriptionModal';

interface ProfilePanelProps {
  user: User;
  onClose: () => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  isTabMode?: boolean;
}

type ProfileViewMode = 'main' | 'edit' | 'settings' | 'privacy' | 'chats' | 'notifications' | 'language' | 'blocked' | 'wallpaper' | 'applock' | 'premium';

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ user, onClose, toggleDarkMode, isDarkMode, isTabMode }) => {
  const { logout } = useAuth();
  const [viewMode, setViewMode] = useState<ProfileViewMode>('main');
  const [name, setName] = useState(user.name);
  const [showSubModal, setShowSubModal] = useState(false);
  const [customization, setCustomization] = useState<PremiumCustomization>(user.premiumCustomization || {});

  // ... (Keep existing simple state initialization for newPhoto, etc. if needed) ...

  const handleCustomizationUpdate = async (key: keyof PremiumCustomization, value: any) => {
      // Check ownership
      const canEquip = user.isAdmin || hasPremiumAccess(user, 'decoration');
      if (!canEquip) { setShowSubModal(true); return; }
      
      const newCustom = { ...customization, [key]: value };
      setCustomization(newCustom);
      await updatePremiumCustomization(user.uid, newCustom);
  };

  const SettingsItem = ({ icon, title, subtitle, target }: any) => (
    <button 
        onClick={(e) => { 
            e.stopPropagation(); 
            setViewMode(target); 
        }}
        className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all border-b border-slate-50 dark:border-slate-800/50"
    >
      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">{icon}</div>
      <div className="flex-1 text-left">
        <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
    </button>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'premium':
          return (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-white text-center shadow-lg">
                      <h3 className="text-xl font-bold">My Decorations</h3>
                      <p className="text-xs opacity-80">Equip your unlocked items.</p>
                  </div>
                  <div>
                      <h4 className="font-bold text-sm mb-3">Profile Borders</h4>
                      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                          {['border-indigo-500', 'border-pink-500', 'border-amber-400', 'border-green-500'].map(b => (
                              <button key={b} onClick={() => handleCustomizationUpdate('borderColor', b)} className={`w-12 h-12 rounded-full border-4 ${b} ${customization.borderColor === b ? 'ring-2 ring-indigo-500' : ''} bg-slate-800 shrink-0`} />
                          ))}
                          <button onClick={() => handleCustomizationUpdate('borderColor', '')} className="w-12 h-12 rounded-full border flex items-center justify-center shrink-0">✕</button>
                      </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <span className="font-bold text-sm">Neon Glow</span>
                      <button onClick={() => handleCustomizationUpdate('glowEffect', !customization.glowEffect)} className={`w-10 h-6 rounded-full transition-colors ${customization.glowEffect ? 'bg-green-500' : 'bg-slate-300'} relative`}>
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${customization.glowEffect ? 'left-5' : 'left-1'}`}></div>
                      </button>
                  </div>
              </div>
          );

      case 'edit':
        return (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                <input value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold" placeholder="Display Name" />
                <button onClick={async () => { await updateProfile(user, { name }); setViewMode('main'); }} className="w-full py-4 bg-indigo-500 text-white rounded-xl font-bold">Save Changes</button>
            </div>
        );

      case 'settings':
        return (
          <div className="space-y-2 animate-in slide-in-from-right-4">
            <SettingsItem title="Decorations" subtitle="Customize your look" icon="🎨" target="premium" />
            <SettingsItem title="Privacy" subtitle="Block users, App Lock" icon="🔒" target="privacy" />
            <div className="pt-8 px-4">
              <button onClick={logout} className="w-full p-4 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-xl font-bold text-sm">Log Out</button>
            </div>
          </div>
        );

      case 'main':
      default:
        return (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col items-center">
                <div className={`relative p-1 rounded-full ${customization.glowEffect ? 'shadow-[0_0_20px_rgba(99,102,241,0.5)]' : ''}`}>
                    <img src={user.photoURL} className={`w-28 h-28 rounded-full object-cover border-4 ${user.isAdmin ? ADMIN_STYLE.border : (customization.borderColor || 'border-transparent')}`} />
                </div>
                <h3 className={`text-xl font-bold mt-4 ${user.isAdmin ? ADMIN_STYLE.text : ''}`}>{user.name}</h3>
                <div className="flex gap-2 mt-6">
                    <button onClick={() => setViewMode('edit')} className="px-6 py-2 bg-indigo-500 text-white rounded-full text-xs font-bold uppercase">Edit</button>
                    <button onClick={() => setViewMode('settings')} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold uppercase">Settings</button>
                </div>
            </div>
            
            <div onClick={toggleDarkMode} className="mx-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between cursor-pointer">
                <span className="font-bold text-sm">Dark Mode</span>
                <div className={`w-10 h-6 rounded-full transition-colors ${isDarkMode ? 'bg-indigo-500' : 'bg-slate-300'} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isDarkMode ? 'left-5' : 'left-1'}`}></div>
                </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in fade-in duration-300">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
        {viewMode !== 'main' && (
            <button onClick={() => setViewMode(viewMode === 'settings' ? 'main' : 'settings')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
        )}
        <h2 className="text-lg font-black uppercase tracking-widest">{viewMode === 'main' ? 'Profile' : viewMode}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24 no-scrollbar">
        {renderContent()}
      </div>
      {showSubModal && <SubscriptionModal currentUser={user} onClose={() => setShowSubModal(false)} />}
    </div>
  );
};
