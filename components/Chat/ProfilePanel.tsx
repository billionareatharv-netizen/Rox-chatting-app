
import React, { useState, useRef, useEffect } from 'react';
import { User, PremiumCustomization } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile, updatePremiumCustomization } from '../../firebase';
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
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || 'Available');
  const [lockPass, setLockPass] = useState(user.chatLockPassword || '');
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  // Premium State
  const [customization, setCustomization] = useState<PremiumCustomization>(user.premiumCustomization || {});

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('roxx_settings');
      return saved ? JSON.parse(saved) : {
        fontSize: 'medium',
        notificationsEnabled: true,
        notificationSound: true,
        language: 'English (US)',
        wallpaper: 'default',
        customWallpaperUrl: null
      };
    } catch (e) {
      return {
        fontSize: 'medium',
        notificationsEnabled: true,
        notificationSound: true,
        language: 'English (US)',
        wallpaper: 'default',
        customWallpaperUrl: null
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('roxx_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('roxx_settings_updated'));
  }, [settings]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, 300, 300);
        setNewPhoto(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile(user, {
        name: name.trim(),
        username: username.trim(),
        bio: bio.trim(),
        chatLockPassword: lockPass.trim(),
        photoURL: newPhoto || user.photoURL
      });
      setViewMode('main');
    } catch (err) { alert("Error saving profile"); }
    finally { setIsSaving(false); }
  };

  const handleCustomizationUpdate = async (key: keyof PremiumCustomization, value: any) => {
      if (!hasPremiumAccess(user, 'decoration')) {
          if (!user.isAdmin) {
              setShowSubModal(true);
              return;
          }
      }
      
      const newCustom = { ...customization, [key]: value };
      setCustomization(newCustom);
      await updatePremiumCustomization(user.uid, newCustom);
  };

  const renderHeader = () => {
    const titles: Record<string, string> = {
      main: "Settings", edit: "Edit Profile", settings: "ROXX Settings",
      privacy: "Privacy", chats: "Chats", notifications: "Notifications",
      language: "App Language", blocked: "Blocked Contacts", wallpaper: "Chat Wallpaper",
      applock: "App Lock", premium: "Premium Store"
    };

    const backTarget: Record<string, ProfileViewMode> = {
      edit: 'main', settings: 'main', privacy: 'settings',
      chats: 'settings', notifications: 'settings', language: 'settings',
      blocked: 'privacy', wallpaper: 'chats', applock: 'privacy', premium: 'main'
    };

    return (
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          {viewMode !== 'main' && (
            <button onClick={() => setViewMode(backTarget[viewMode] || 'main')} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <h2 className="text-xl font-black tracking-tight">{titles[viewMode]}</h2>
        </div>
        {!isTabMode && viewMode === 'main' && (
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
    );
  };

  const SettingsItem = ({ icon, title, subtitle, onClick, color = "indigo", toggle }: any) => (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group border-b border-slate-50 dark:border-slate-800/50 last:border-0">
      <div className={`p-2.5 rounded-xl bg-${color}-500/10 text-${color}-500 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-bold text-[13px] text-slate-900 dark:text-slate-100 leading-tight">{title}</p>
        {subtitle && <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{subtitle}</p>}
      </div>
      {toggle !== undefined ? (
        <div className={`w-9 h-5 rounded-full transition-all relative ${toggle ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${toggle ? 'left-5' : 'left-1'}`}></div>
        </div>
      ) : (
        <svg className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'premium':
          const BORDERS = ['border-indigo-500', 'border-pink-500', 'border-amber-400', 'border-green-500', 'border-white'];
          const NAME_COLORS = ['text-indigo-500', 'text-pink-500', 'text-amber-400', 'text-green-500', 'text-white'];
          
          return (
              <div className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl text-white text-center shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                        <h3 className="text-2xl font-black mb-2">Premium Customization</h3>
                        <p className="text-xs font-bold opacity-80 mb-4">Make your profile shine across the app.</p>
                        {!user.isAdmin && !hasPremiumAccess(user, 'decoration') && (
                            <button onClick={() => setShowSubModal(true)} className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg">Upgrade Now</button>
                        )}
                        {user.isAdmin && <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Admin Access Unlocked</div>}
                      </div>
                  </div>

                  {/* Border Selection */}
                  <div>
                      <h4 className="font-bold text-sm mb-3">Profile Border Glow</h4>
                      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                          {BORDERS.map(b => (
                              <button 
                                key={b}
                                onClick={() => handleCustomizationUpdate('borderColor', b)}
                                className={`w-12 h-12 rounded-full border-4 ${b} ${customization.borderColor === b ? 'ring-2 ring-offset-2 ring-indigo-500' : ''} shrink-0 bg-slate-800`}
                              />
                          ))}
                          <button onClick={() => handleCustomizationUpdate('borderColor', '')} className="w-12 h-12 rounded-full border border-slate-500 flex items-center justify-center shrink-0"><span className="text-xs">None</span></button>
                      </div>
                  </div>

                  {/* Username Color */}
                  <div>
                      <h4 className="font-bold text-sm mb-3">Username Color</h4>
                      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                          {NAME_COLORS.map(c => (
                              <button 
                                key={c}
                                onClick={() => handleCustomizationUpdate('usernameColor', c)}
                                className={`w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center ${customization.usernameColor === c ? 'ring-2 ring-indigo-500' : ''} shrink-0`}
                              >
                                  <span className={`font-black text-lg ${c}`}>Aa</span>
                              </button>
                          ))}
                          <button onClick={() => handleCustomizationUpdate('usernameColor', '')} className="w-12 h-12 rounded-xl border border-slate-500 flex items-center justify-center shrink-0"><span className="text-xs">Reset</span></button>
                      </div>
                  </div>

                  {/* Glow Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <div>
                          <h4 className="font-bold text-sm">Neon Glow Effect</h4>
                          <p className="text-[10px] text-slate-500">Add a soft light behind your avatar</p>
                      </div>
                      <button 
                        onClick={() => handleCustomizationUpdate('glowEffect', !customization.glowEffect)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${customization.glowEffect ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${customization.glowEffect ? 'left-7' : 'left-1'}`} />
                      </button>
                  </div>
              </div>
          );

      case 'edit':
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center gap-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className={`w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 shadow-2xl transition-all ${user.isAdmin ? ADMIN_STYLE.border : (customization.borderColor || 'border-indigo-500/20')} ${customization.glowEffect ? 'shadow-[0_0_30px_rgba(99,102,241,0.5)]' : ''}`}>
                  <img src={newPhoto || user.photoURL} className="w-full h-full object-cover transition-all group-hover:brightness-75" alt="" />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoSelect} />
              </div>
            </div>
            <div className="space-y-6">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Display Name" className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 py-4 font-bold outline-none border border-transparent focus:border-indigo-500/50" />
              <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl pl-10 pr-6 py-4 font-bold outline-none border border-transparent focus:border-indigo-500/50" />
              </div>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio" className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 py-4 text-sm font-medium outline-none resize-none" rows={3} />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setViewMode('main')} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">Cancel</button>
              <button onClick={handleSave} className="flex-[2] py-4 bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-xl">Save Changes</button>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-1 animate-in slide-in-from-right-4 duration-500">
            <SettingsItem title="Premium Decoration" subtitle="Customize borders, colors & glows" icon={<span className="text-xl">🎨</span>} onClick={() => setViewMode('premium')} color="pink" />
            <SettingsItem title="Privacy" subtitle="Blocked, read receipts, app lock" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} onClick={() => setViewMode('privacy')} />
            <SettingsItem title="Chats" subtitle="Wallpaper, font size, clear history" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>} onClick={() => setViewMode('chats')} />
            <div className="pt-8 px-4">
              <button onClick={logout} className="w-full p-5 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-3xl text-sm font-bold flex items-center gap-4 border border-red-100/50 hover:bg-red-100 transition-colors">
                <div className="p-2 bg-red-500 text-white rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </div>
                Logout Account
              </button>
            </div>
          </div>
        );

      case 'main':
      default:
        const plan = user.subscription?.isActive ? getPlanDetails(user.subscription.plan) : null;
        
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6 mt-6">
                <div className="relative">
                  {/* ADMIN CROWN */}
                  {user.isAdmin && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-5xl animate-bounce drop-shadow-xl z-20">
                      {ADMIN_STYLE.icon}
                    </div>
                  )}
                  
                  <div className={`p-1 rounded-[3rem] ${user.isAdmin ? ADMIN_STYLE.glow : (customization.glowEffect ? 'shadow-[0_0_30px_rgba(99,102,241,0.5)]' : '')}`}>
                    <img 
                        src={user.photoURL} 
                        className={`w-32 h-32 rounded-[3rem] object-cover shadow-2xl border-4 ${user.isAdmin ? ADMIN_STYLE.border : (customization.borderColor || 'border-indigo-500/10')}`} 
                        alt="" 
                    />
                  </div>
                  
                  {!user.isAdmin && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center">
                       <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className={`text-2xl font-black tracking-tight ${user.isAdmin ? ADMIN_STYLE.text : (customization.usernameColor || '')}`}>
                {user.name}
              </h3>
              
              <p className="text-sm text-slate-500 mt-2 font-medium max-w-[200px]">{user.bio || 'Available'}</p>
              
              <div className="flex items-center gap-3 mt-8">
                <button onClick={() => setViewMode('edit')} className="flex items-center gap-2 bg-indigo-500 text-white px-8 py-3.5 rounded-2xl hover:bg-indigo-600 transition-all font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95">Edit Profile</button>
                <button onClick={() => setViewMode('settings')} className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all text-slate-500 active:scale-95 shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
              </div>
            </div>

            {/* Admin or Premium Banner */}
            {user.isAdmin ? (
                <div className={`mx-2 p-1 rounded-2xl ${ADMIN_STYLE.badgeBg} shadow-xl shadow-amber-500/20 animate-pulse-slow`}>
                    <div className="bg-black/20 backdrop-blur-sm rounded-[14px] p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{ADMIN_STYLE.icon}</span>
                            <div>
                                <h4 className="text-lg font-black text-white tracking-widest text-shadow-sm">ROXX ADMIN</h4>
                                <p className="text-[10px] font-bold text-yellow-100 uppercase">Supreme Access Granted</p>
                            </div>
                        </div>
                        <div className="h-2 w-2 bg-white rounded-full animate-ping"></div>
                    </div>
                </div>
            ) : (
                <div 
                    onClick={() => setShowSubModal(true)} 
                    className="mx-2 p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg cursor-pointer relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/20 blur-2xl rounded-full"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Current Plan</p>
                            <h4 className="text-xl font-black mt-1">
                                {plan ? plan.name.toUpperCase() : "FREE TIER"}
                            </h4>
                        </div>
                        <div className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white hover:text-black transition-colors">
                            {plan ? 'Manage' : 'Upgrade'}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2 mb-3">Quick Preferences</h4>
              <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700" onClick={toggleDarkMode}>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-slate-700 shadow-sm rounded-xl text-indigo-500">{isDarkMode ? '🌙' : '☀️'}</div>
                  <span className="text-sm font-bold">Dark Appearance</span>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${isDarkMode ? 'left-7' : 'left-1'}`}></div></div>
              </div>
            </div>
          </div>
        );
    }
  };

  const panelContent = (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-900 animate-in fade-in duration-300`}>
      {renderHeader()}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-24">
        {renderContent()}
      </div>
      {showSubModal && <SubscriptionModal currentUser={user} onClose={() => setShowSubModal(false)} />}
    </div>
  );

  if (isTabMode) return panelContent;
  return (
    <div className={`fixed inset-0 z-50 flex justify-end`}>
      <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity`} onClick={onClose}></div>
      <div className={`relative bg-white dark:bg-slate-900 shadow-2xl flex flex-col w-full max-w-sm h-full animate-slide-left`}>{panelContent}</div>
    </div>
  );
};
