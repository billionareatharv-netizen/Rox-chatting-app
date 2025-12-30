
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile } from '../../firebase';

interface ProfilePanelProps {
  user: User;
  onClose: () => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  isTabMode?: boolean;
}

type ProfileViewMode = 'main' | 'edit' | 'settings' | 'privacy' | 'chats' | 'notifications' | 'language' | 'blocked' | 'wallpaper';

const WALLPAPER_OPTIONS = [
  { id: 'default', name: 'Default', class: 'bg-slate-100 dark:bg-slate-900' },
  { id: 'indigo', name: 'Indigo Night', class: 'bg-indigo-600' },
  { id: 'emerald', name: 'Emerald Forest', class: 'bg-emerald-700' },
  { id: 'rose', name: 'Rose Petal', class: 'bg-rose-500' },
  { id: 'amber', name: 'Amber Sunset', class: 'bg-amber-500' },
  { id: 'dark', name: 'Pure Dark', class: 'bg-black' },
  { id: 'gradient', name: 'Cosmic', class: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-black' },
];

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ user, onClose, toggleDarkMode, isDarkMode, isTabMode }) => {
  const { logout } = useAuth();
  const [viewMode, setViewMode] = useState<ProfileViewMode>('main');
  
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || 'Available');
  const [lockPass, setLockPass] = useState(user.chatLockPassword || '');
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('roxx_settings');
    return saved ? JSON.parse(saved) : {
      readReceipts: true,
      lastSeen: 'everyone',
      fontSize: 'medium',
      notificationsEnabled: true,
      notificationSound: true,
      language: 'English (US)',
      wallpaper: 'default',
      customWallpaperUrl: null
    };
  });

  useEffect(() => {
    localStorage.setItem('roxx_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('roxx_settings_updated'));
  }, [settings]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressWallpaper = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleCustomWallpaper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressWallpaper(file);
    setSettings({
      ...settings,
      wallpaper: 'custom',
      customWallpaperUrl: compressed
    });
  };

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
        bio: bio.trim(),
        chatLockPassword: lockPass.trim(),
        photoURL: newPhoto || user.photoURL
      });
      setViewMode('main');
    } catch (err) { alert("Error saving profile"); }
    finally { setIsSaving(false); }
  };

  const renderHeader = () => {
    const titles: Record<string, string> = {
      main: "Settings", edit: "Edit Profile", settings: "ROXX Settings",
      privacy: "Privacy", chats: "Chats", notifications: "Notifications",
      language: "App Language", blocked: "Blocked Contacts", wallpaper: "Chat Wallpaper"
    };

    const backTarget: Record<string, ProfileViewMode> = {
      edit: 'main', settings: 'main', privacy: 'settings',
      chats: 'settings', notifications: 'settings', language: 'settings',
      blocked: 'privacy', wallpaper: 'chats'
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
      case 'edit':
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center gap-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-indigo-500/20 shadow-2xl">
                  <img src={newPhoto || user.photoURL} className="w-full h-full object-cover transition-all group-hover:brightness-75" alt="" />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoSelect} />
              </div>
            </div>
            <div className="space-y-6">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Display Name" className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 py-4 font-bold outline-none border border-transparent focus:border-indigo-500/50" />
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
            <SettingsItem title="Privacy" subtitle="Blocked, read receipts, last seen" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} onClick={() => setViewMode('privacy')} />
            <SettingsItem title="Chats" subtitle="Wallpaper, font size, clear history" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>} onClick={() => setViewMode('chats')} />
            <SettingsItem title="Notifications" subtitle="Tones, vibration, alerts" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>} onClick={() => setViewMode('notifications')} />
            <SettingsItem title="Language" subtitle={settings.language} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} onClick={() => setViewMode('language')} />
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

      case 'chats':
        return (
          <div className="space-y-1 animate-in slide-in-from-right-4 duration-500">
            <SettingsItem title="Wallpaper" subtitle="Customize your chat background" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} onClick={() => setViewMode('wallpaper')} />
            <SettingsItem title="Font Size" subtitle={settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)} onClick={() => {
              const sizes = ['small', 'medium', 'large'];
              setSettings({...settings, fontSize: sizes[(sizes.indexOf(settings.fontSize) + 1) % sizes.length]});
            }} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07" /></svg>} />
            <SettingsItem title="Clear All Chats" subtitle="Permanently delete all conversation history" color="red" onClick={() => {
              if (window.confirm("Are you sure you want to clear all chat history? This cannot be undone.")) {
                localStorage.removeItem('gemini_chat_db_messages');
                localStorage.removeItem('gemini_chat_db_chats');
                window.location.reload();
              }
            }} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>} />
          </div>
        );

      case 'wallpaper':
        return (
          <div className="flex flex-col gap-6 p-2 animate-in slide-in-from-right-4 duration-500">
            <button 
              onClick={() => wallpaperInputRef.current?.click()}
              className="w-full py-5 bg-indigo-500 text-white rounded-3xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Choose from Gallery
            </button>
            <input type="file" ref={wallpaperInputRef} onChange={handleCustomWallpaper} accept="image/*" className="hidden" />

            <div className="grid grid-cols-2 gap-4">
              {/* Custom Thumbnail if active */}
              {settings.customWallpaperUrl && (
                <button 
                  onClick={() => setSettings({...settings, wallpaper: 'custom'})}
                  className={`relative aspect-[9/16] rounded-2xl overflow-hidden border-4 transition-all ${settings.wallpaper === 'custom' ? 'border-indigo-500 scale-[1.02] shadow-lg' : 'border-transparent hover:border-slate-200'}`}
                >
                  <img src={settings.customWallpaperUrl} className="w-full h-full object-cover" alt="" />
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-black/60 backdrop-blur-md">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Your Photo</p>
                  </div>
                  {settings.wallpaper === 'custom' && (
                    <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-1.5 shadow-md">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </button>
              )}

              {WALLPAPER_OPTIONS.map(wp => (
                <button 
                  key={wp.id} 
                  onClick={() => setSettings({...settings, wallpaper: wp.id})}
                  className={`relative aspect-[9/16] rounded-2xl overflow-hidden border-4 transition-all ${settings.wallpaper === wp.id ? 'border-indigo-500 scale-[1.02] shadow-lg' : 'border-transparent hover:border-slate-200 shadow-sm'}`}
                >
                  <div className={`w-full h-full ${wp.class}`}>
                     <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/asfalt-dark.png')` }}></div>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-black/60 backdrop-blur-md">
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">{wp.name}</p>
                  </div>
                  {settings.wallpaper === wp.id && (
                    <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-1.5 shadow-md">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-1 animate-in slide-in-from-right-4 duration-500">
             <SettingsItem title="Last Seen" subtitle={settings.lastSeen.charAt(0).toUpperCase() + settings.lastSeen.slice(1)} onClick={() => {
                const opts = ['everyone', 'contacts', 'nobody'];
                setSettings({...settings, lastSeen: opts[(opts.indexOf(settings.lastSeen) + 1) % opts.length]});
             }} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
             <SettingsItem title="Read Receipts" subtitle="Show when you have read messages" toggle={settings.readReceipts} onClick={() => setSettings({...settings, readReceipts: !settings.readReceipts})} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>} />
             <SettingsItem title="Blocked Contacts" subtitle={`${user.blockedUsers?.length || 0} contacts`} onClick={() => setViewMode('blocked')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>} />
          </div>
        );

      case 'blocked':
        return (
          <div className="p-2 animate-in slide-in-from-right-4 duration-500 space-y-3">
             {(!user.blockedUsers || user.blockedUsers.length === 0) ? (
               <div className="py-20 text-center opacity-40">
                  <p className="text-sm font-bold">No blocked users</p>
               </div>
             ) : (
               user.blockedUsers.map(uid => (
                 <div key={uid} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-sm font-bold">User {uid.slice(0, 8)}</span>
                    <button className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-600">Unblock</button>
                 </div>
               ))
             )}
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-1 animate-in slide-in-from-right-4 duration-500">
            <SettingsItem title="Enable Notifications" subtitle="Receive alerts for new messages" toggle={settings.notificationsEnabled} onClick={() => setSettings({...settings, notificationsEnabled: !settings.notificationsEnabled})} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>} />
            <SettingsItem title="Play Sounds" subtitle="Play audio tones for alerts" toggle={settings.notificationSound} onClick={() => setSettings({...settings, notificationSound: !settings.notificationSound})} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072" /></svg>} />
          </div>
        );

      case 'language':
        const langs = ['English (US)', 'Hindi (India)', 'Spanish (Spain)', 'French (France)', 'German (Germany)'];
        return (
          <div className="space-y-1 animate-in slide-in-from-right-4 duration-500">
             {langs.map(l => (
               <button 
                key={l} 
                onClick={() => setSettings({...settings, language: l})} 
                className={`w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-50 dark:border-slate-800 transition-colors ${settings.language === l ? 'bg-indigo-500/5' : ''}`}
               >
                 <span className={`text-sm font-bold ${settings.language === l ? 'text-indigo-500' : 'text-slate-700 dark:text-slate-300'}`}>{l}</span>
                 {settings.language === l && <div className="p-1 bg-indigo-500 rounded-full"><svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg></div>}
               </button>
             ))}
          </div>
        );

      case 'main':
      default:
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="relative">
                  <img src={user.photoURL} className="w-32 h-32 rounded-[3rem] object-cover shadow-2xl ring-4 ring-indigo-500/10" alt="" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center">
                     <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-black tracking-tight">{user.name}</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium max-w-[200px]">{user.bio || 'Available'}</p>
              <div className="flex items-center gap-3 mt-8">
                <button onClick={() => setViewMode('edit')} className="flex items-center gap-2 bg-indigo-500 text-white px-8 py-3.5 rounded-2xl hover:bg-indigo-600 transition-all font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95">Edit Profile</button>
                <button onClick={() => setViewMode('settings')} className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all text-slate-500 active:scale-95 shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
              </div>
            </div>
            <div className="space-y-3 pt-6">
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
