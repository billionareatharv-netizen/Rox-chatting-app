import React, { useState, useRef } from 'react';
import { User, PremiumCustomization } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile, updatePremiumCustomization, saveWallpaper, updatePrivacySettings } from '../../firebase';
import { hasPremiumAccess, ADMIN_STYLE } from '../../premiumUtils';
import { SubscriptionModal } from '../Premium/SubscriptionModal';

interface ProfilePanelProps {
  user: User;
  onClose: () => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  isTabMode?: boolean;
}

type ProfileViewMode = 'main' | 'edit' | 'premium' | 'settings' | 'privacy' | 'chats_settings';

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

  const handleWallpaperSelect = async (color: string) => {
      await saveWallpaper(user.uid, 'default', color);
      alert("Global Wallpaper Updated!");
  };

  const handlePrivacyToggle = async (key: string, current: any) => {
      let newVal: any = !current;
      if (key === 'lastSeen') newVal = current === 'nobody' ? 'everyone' : 'nobody';
      
      const updated = { ...user.privacySettings, [key]: newVal };
      await updatePrivacySettings(user.uid, updated);
  };

  const renderHeader = (title: string, onBack?: () => void, rightAction?: React.ReactNode) => (
    <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-4">
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
      {rightAction}
    </div>
  );

  const ListItem = ({ icon, label, subLabel, onClick, color = "slate", value }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-50 dark:border-slate-800/50 last:border-0">
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

  // VIEW: EDIT PROFILE
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

  // VIEW: PREMIUM
  if (viewMode === 'premium') {
      return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right">
              {renderHeader("Decorations", () => setViewMode('main'))}
              <div className="p-6 space-y-8 overflow-y-auto no-scrollbar">
                  {/* ... Decoration content ... */}
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

  // VIEW: SETTINGS MAIN
  if (viewMode === 'settings') {
      return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right">
              {renderHeader("Settings", () => setViewMode('main'))}
              <div className="p-4 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        <ListItem 
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                            label="Chats"
                            subLabel="Wallpaper, Font Size"
                            color="indigo"
                            onClick={() => setViewMode('chats_settings')}
                        />
                        <ListItem 
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                            label="Privacy"
                            subLabel="Block users, Last Seen"
                            color="green"
                            onClick={() => setViewMode('privacy')}
                        />
                        <ListItem 
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                            label="Appearance"
                            subLabel={isDarkMode ? "Dark Mode" : "Light Mode"}
                            color="purple"
                            onClick={toggleDarkMode}
                        />
                    </div>
                </div>
                
                {/* Logout Button inside Settings */}
                <button onClick={logout} className="w-full p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-500 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign Out
                </button>
              </div>
          </div>
      );
  }

  // VIEW: CHAT SETTINGS
  if (viewMode === 'chats_settings') {
      return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right">
              {renderHeader("Chat Settings", () => setViewMode('settings'))}
              <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
                  {/* Wallpaper Section */}
                  <div>
                      <h4 className="font-bold text-sm mb-4 text-indigo-500 uppercase tracking-wider">Chat Wallpaper</h4>
                      <div className="grid grid-cols-3 gap-3">
                          <button onClick={() => handleWallpaperSelect('default')} className="aspect-[9/16] rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent hover:border-indigo-500 flex flex-col items-center justify-center gap-2">
                              <span className="text-2xl">⚪</span>
                              <span className="text-[10px] font-bold">Default</span>
                          </button>
                          <button onClick={() => handleWallpaperSelect('indigo')} className="aspect-[9/16] rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-transparent hover:border-indigo-500 flex flex-col items-center justify-center gap-2">
                              <span className="text-2xl">🟣</span>
                              <span className="text-[10px] font-bold">Indigo</span>
                          </button>
                          <button onClick={() => handleWallpaperSelect('dark')} className="aspect-[9/16] rounded-xl bg-slate-950 border-2 border-transparent hover:border-indigo-500 flex flex-col items-center justify-center gap-2 text-white">
                              <span className="text-2xl">⚫</span>
                              <span className="text-[10px] font-bold">Dark</span>
                          </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 text-center">This sets your default wallpaper for all chats.</p>
                  </div>
              </div>
          </div>
      );
  }

  // VIEW: PRIVACY SETTINGS
  if (viewMode === 'privacy') {
      return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right">
              {renderHeader("Privacy", () => setViewMode('settings'))}
              <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div>
                          <p className="font-bold text-sm">Last Seen</p>
                          <p className="text-[10px] text-slate-500">{user.privacySettings?.lastSeen === 'nobody' ? 'Hidden' : 'Visible'}</p>
                      </div>
                      <button 
                        onClick={() => handlePrivacyToggle('lastSeen', user.privacySettings?.lastSeen)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${user.privacySettings?.lastSeen !== 'nobody' ? 'bg-green-500' : 'bg-slate-300'}`}
                      >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${user.privacySettings?.lastSeen !== 'nobody' ? 'translate-x-7' : 'translate-x-1'}`}></div>
                      </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div>
                          <p className="font-bold text-sm">Read Receipts</p>
                          <p className="text-[10px] text-slate-500">Show blue ticks</p>
                      </div>
                      <button 
                        onClick={() => handlePrivacyToggle('readReceipts', user.privacySettings?.readReceipts)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${user.privacySettings?.readReceipts ? 'bg-green-500' : 'bg-slate-300'}`}
                      >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${user.privacySettings?.readReceipts ? 'translate-x-7' : 'translate-x-1'}`}></div>
                      </button>
                  </div>

                  <ListItem 
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                      label="Blocked Contacts"
                      subLabel={`${user.blockedUsers?.length || 0} blocked`}
                      onClick={() => {}}
                  />
              </div>
          </div>
      );
  }

  // MAIN VIEW (Cleaned up)
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in fade-in">
      {renderHeader(
          isTabMode ? "My Profile" : "Profile", 
          isTabMode ? undefined : onClose,
          <button onClick={() => setViewMode('settings')} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
      )}
      
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
            
            <div className="flex gap-2 mt-5">
                <button onClick={() => setViewMode('edit')} className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                    Edit Profile
                </button>
            </div>
        </div>

        {/* Info Grid */}
        <div className="p-4 grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-3xl text-center">
                <span className="text-2xl block mb-1">📅</span>
                <p className="text-[10px] uppercase font-bold text-slate-400">Joined</p>
                <p className="font-bold text-slate-700 dark:text-indigo-300">2024</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-3xl text-center cursor-pointer" onClick={() => setViewMode('premium')}>
                <span className="text-2xl block mb-1">💎</span>
                <p className="text-[10px] uppercase font-bold text-slate-400">Status</p>
                <p className="font-bold text-slate-700 dark:text-purple-300">{user.subscription?.isActive ? user.subscription.plan.toUpperCase() : 'Free'}</p>
            </div>
        </div>

        {/* Premium Banner */}
        <div className="px-4">
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
        </div>

        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60 mt-10 mb-6">ROXX Chat v1.4.0</p>
      </div>
      {showSubModal && <SubscriptionModal currentUser={user} onClose={() => setShowSubModal(false)} />}
    </div>
  );
};