
import React, { useState, useRef } from 'react';
import { User, PremiumCustomization } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile, updatePremiumCustomization } from '../../firebase';
import { hasPremiumAccess, ADMIN_STYLE } from '../../premiumUtils';
import { SubscriptionModal } from '../Premium/SubscriptionModal';

interface ProfilePanelProps {
  user: User;
  onClose: () => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  isTabMode?: boolean;
}

type ProfileViewMode = 'main' | 'edit' | 'premium' | 'privacy';

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ user, onClose, toggleDarkMode, isDarkMode, isTabMode }) => {
  const { logout } = useAuth();
  const [viewMode, setViewMode] = useState<ProfileViewMode>('main');
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [showSubModal, setShowSubModal] = useState(false);
  const [customization, setCustomization] = useState<PremiumCustomization>(user.premiumCustomization || {});
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if(ev.target?.result) {
            await updateProfile(user, { photoURL: ev.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
      setIsSaving(true);
      await updateProfile(user, { name, bio });
      setIsSaving(false);
      setViewMode('main');
  };

  const handleCustomizationUpdate = async (key: keyof PremiumCustomization, value: any) => {
      const canEquip = user.isAdmin || hasPremiumAccess(user, 'decoration');
      if (!canEquip) { setShowSubModal(true); return; }
      
      const newCustom = { ...customization, [key]: value };
      setCustomization(newCustom);
      await updatePremiumCustomization(user.uid, newCustom);
  };

  const renderHeader = (title: string, onBack?: () => void) => (
    <div className="h-16 px-6 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
      {onBack ? (
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
      ) : !isTabMode && (
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
           <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
    </div>
  );

  const ListItem = ({ icon, label, subLabel, onClick, color = "slate", value }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-100 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div className="text-left">
                <p className="font-bold text-sm text-slate-900 dark:text-white">{label}</p>
                {subLabel && <p className="text-[11px] font-medium text-slate-500">{subLabel}</p>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs font-bold text-slate-400">{value}</span>}
            <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
        </div>
    </button>
  );

  if (viewMode === 'edit') {
      return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right">
              {renderHeader("Edit Profile", () => setViewMode('main'))}
              <div className="p-6 space-y-6">
                  <div className="flex justify-center">
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          <img src={user.photoURL} className="w-32 h-32 rounded-full object-cover border-4 border-slate-100 dark:border-slate-800" alt="" />
                          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-white text-xs font-bold uppercase">Change</span>
                          </div>
                          <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} className="hidden" accept="image/*" />
                      </div>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Display Name</label>
                          <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl outline-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 transition-all" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">About</label>
                          <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full mt-1 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl outline-none font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none h-24" />
                      </div>
                  </div>
                  <button onClick={handleSaveProfile} disabled={isSaving} className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                      {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
              </div>
          </div>
      );
  }

  if (viewMode === 'premium') {
      return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right">
              {renderHeader("Decorations", () => setViewMode('main'))}
              <div className="p-6 space-y-8 overflow-y-auto no-scrollbar">
                  <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] text-white text-center shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                        <span className="text-4xl mb-2 block">🎨</span>
                        <h3 className="text-xl font-bold mb-1">Customize Your Look</h3>
                        <p className="text-xs opacity-80 mb-4">Stand out with glowing borders & colors.</p>
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-sm mb-4 px-2">Avatar Border</h4>
                      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2">
                          <button onClick={() => handleCustomizationUpdate('borderColor', '')} className="flex flex-col items-center gap-2 min-w-[60px]">
                              <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400">Off</div>
                              <span className="text-[10px] font-bold">None</span>
                          </button>
                          {['border-indigo-500', 'border-pink-500', 'border-amber-400', 'border-green-500', 'border-cyan-400'].map(b => (
                              <button key={b} onClick={() => handleCustomizationUpdate('borderColor', b)} className="flex flex-col items-center gap-2 min-w-[60px]">
                                  <div className={`w-14 h-14 rounded-full border-[3px] ${b} bg-slate-900 ${customization.borderColor === b ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}></div>
                                  <span className="text-[10px] font-bold capitalize">{b.split('-')[1]}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="px-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
                      <div>
                          <h4 className="font-bold text-sm">Neon Glow Effect</h4>
                          <p className="text-[10px] text-slate-500">Add a soft light behind your avatar</p>
                      </div>
                      <button onClick={() => handleCustomizationUpdate('glowEffect', !customization.glowEffect)} className={`w-12 h-7 rounded-full transition-colors relative ${customization.glowEffect ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm ${customization.glowEffect ? 'left-6' : 'left-1'}`}></div>
                      </button>
                  </div>
              </div>
              {showSubModal && <SubscriptionModal currentUser={user} onClose={() => setShowSubModal(false)} />}
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in fade-in">
      {renderHeader(isTabMode ? "My Profile" : "Profile")}
      
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Main Profile Card */}
        <div className="relative pt-8 pb-8 px-6 flex flex-col items-center text-center bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <div className={`relative mb-4 ${customization.glowEffect ? 'drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]' : ''}`}>
                <img 
                    src={user.photoURL} 
                    className={`w-28 h-28 rounded-full object-cover border-[4px] ${user.isAdmin ? ADMIN_STYLE.border : (customization.borderColor || 'border-white dark:border-slate-800')} shadow-xl`} 
                    alt="" 
                />
                {user.isAdmin && (
                    <div className="absolute -top-2 -right-2 text-2xl filter drop-shadow-md animate-bounce">{ADMIN_STYLE.icon}</div>
                )}
            </div>
            <h2 className={`text-2xl font-black text-slate-900 dark:text-white ${user.isAdmin ? ADMIN_STYLE.text : ''}`}>{user.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1 max-w-[250px]">{user.bio || "No bio set"}</p>
            
            <button onClick={() => setViewMode('edit')} className="mt-5 px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                Edit Profile
            </button>
        </div>

        {/* Menu Sections */}
        <div className="p-4 space-y-6">
            
            {/* Account Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Account</h4>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    <ListItem 
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
                        label="Privacy"
                        subLabel="Block users, App Lock"
                        color="green"
                        onClick={() => {}} // Placeholder for privacy modal
                    />
                    <ListItem 
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                        label="Appearance"
                        subLabel={isDarkMode ? "Dark Mode On" : "Light Mode On"}
                        color="purple"
                        onClick={toggleDarkMode}
                    />
                </div>
            </div>

            {/* Premium Section */}
            <div 
                onClick={() => setViewMode('premium')}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-1 cursor-pointer shadow-lg transition-transform hover:scale-[1.01]"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-slate-900/90 rounded-[22px] p-4 flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                            <span className="text-2xl">✨</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-white">Decorations</h4>
                            <p className="text-[11px] text-slate-400">Borders, Glows & Colors</p>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-bold rounded-lg uppercase">Open</div>
                </div>
            </div>

            {/* Logout */}
            <button onClick={logout} className="w-full p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-500 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
            </button>

            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">ROXX Chat v1.2.0</p>
        </div>
      </div>
      {showSubModal && <SubscriptionModal currentUser={user} onClose={() => setShowSubModal(false)} />}
    </div>
  );
};
