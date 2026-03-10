import React, { useState, useRef, useEffect } from 'react';
import { User, PremiumCustomization, SavedMedia, Post } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile, saveWallpaper, updatePrivacySettings, getSavedGallery, subscribeToUserPosts, subscribeToUser } from '../../firebase';
import { SubscriptionModal } from '../Premium/SubscriptionModal';
import { aiService } from '../../src/services/aiService';
import { AISelectionModal } from './AISelectionModal';

interface ProfilePanelProps {
  user: User;
  onClose: () => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  isTabMode?: boolean;
  onOpenPost?: (post: Post) => void;
  onOpenConnections?: (type: 'followers' | 'following') => void;
}

type ProfileViewMode = 'main' | 'edit' | 'settings' | 'privacy' | 'chats_settings';

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ 
    user: initialUser, onClose, toggleDarkMode, isDarkMode, isTabMode, onOpenPost, onOpenConnections 
}) => {
  const { logout } = useAuth();
  const [user, setUser] = useState<User>(initialUser);
  const [viewMode, setViewMode] = useState<ProfileViewMode>('main');
  const [activeTab, setActiveTab] = useState<'grid' | 'reels' | 'tagged'>('grid');
  const [name, setName] = useState(initialUser.name);
  const [bio, setBio] = useState(initialUser.bio || '');
  const [showSubModal, setShowSubModal] = useState(false);
  const [galleryItems, setGalleryItems] = useState<SavedMedia[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiOptions, setAiOptions] = useState<string[]>([]);
  const [showAIModal, setShowAIModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Sync User Profile in Real-time
    const unsubUser = subscribeToUser(initialUser.uid, (data) => {
        if (data) setUser(data as User);
    });
    
    // 2. Sync Posts in Real-time (Fixes the "0 posts" issue)
    const unsubPosts = subscribeToUserPosts(initialUser.uid, (posts) => {
        setUserPosts(posts);
    });

    getSavedGallery(initialUser.uid).then(items => setGalleryItems(items as SavedMedia[]));
    
    return () => {
        unsubUser();
        unsubPosts();
    };
  }, [initialUser.uid]);

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

  const handleAIBio = async () => {
    if (isAIGenerating) return;
    setIsAIGenerating(true);
    setAiOptions([]);
    setShowAIModal(true);
    try {
      const options = await aiService.generateBioOptions(bio || "I love social media and design");
      setAiOptions(options);
    } catch (e) {
      console.error(e);
      setShowAIModal(false);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleAIRefine = async () => {
    if (!bio.trim() || isAIGenerating) return;
    setIsAIGenerating(true);
    try {
      const refined = await aiService.refineText(bio);
      setBio(refined);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handlePrivacyToggle = async (key: string, current: any) => {
      let newVal: any = !current;
      if (key === 'lastSeen') newVal = current === 'nobody' ? 'everyone' : 'nobody';
      const updated = { ...user.privacySettings, [key]: newVal };
      await updatePrivacySettings(user.uid, updated);
  };

  const handleWallpaperSelect = async (color: string) => {
    await saveWallpaper(user.uid, 'default', color);
    alert("Wallpaper Updated!");
  };

  const renderSubHeader = (title: string, onBack: () => void) => (
    <nav className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-3 flex items-center gap-4 border-b border-gray-200 dark:border-border-dark">
      <button onClick={onBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
        <span className="material-symbols-outlined text-2xl">arrow_back_ios</span>
      </button>
      <h2 className="text-sm font-bold tracking-tight uppercase">{title}</h2>
    </nav>
  );

  if (viewMode === 'edit') {
      return (
          <div className="flex flex-col h-full bg-background-light dark:bg-background-dark animate-in slide-in-from-right">
              {renderSubHeader("Edit Profile", () => setViewMode('main'))}
              <div className="p-6 space-y-6">
                  <div className="flex justify-center">
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          <img src={user.photoURL} className="w-32 h-32 rounded-full object-cover border-4 border-primary/20" alt="" />
                          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-white text-xs font-bold uppercase">Change</span>
                          </div>
                          <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} className="hidden" accept="image/*" />
                      </div>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Display Name</label>
                          <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 bg-slate-100 dark:bg-card-dark p-4 rounded-2xl outline-none font-bold text-slate-900 dark:text-white border border-transparent focus:border-primary transition-all" />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Bio</label>
                          <div className="relative">
                            <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full mt-1 bg-slate-100 dark:bg-card-dark p-4 rounded-2xl outline-none font-medium text-slate-900 dark:text-white border border-transparent focus:border-primary transition-all resize-none h-24" />
                            <div className="flex gap-2 absolute bottom-3 right-3">
                                <button 
                                    onClick={handleAIRefine}
                                    disabled={isAIGenerating || !bio.trim()}
                                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-30"
                                    title="Refine with AI"
                                >
                                    <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                                    Refine
                                </button>
                                <button 
                                    onClick={handleAIBio}
                                    disabled={isAIGenerating}
                                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                                >
                                    <span className="material-symbols-outlined text-xs">magic_button</span>
                                    {isAIGenerating ? 'Generating...' : 'AI Bio'}
                                </button>
                            </div>
                          </div>
                      </div>
                  </div>
                  <button onClick={handleSaveProfile} disabled={isSaving} className="w-full h-14 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
                      {isSaving ? 'Updating...' : 'Save Changes'}
                  </button>
              </div>
          </div>
      );
  }

  if (viewMode === 'settings') {
      return (
          <div className="flex flex-col h-full bg-background-light dark:bg-background-dark animate-in slide-in-from-right">
              {renderSubHeader("Settings", () => setViewMode('main'))}
              <div className="p-4 space-y-4">
                  <button onClick={() => setViewMode('privacy')} className="w-full flex items-center justify-between p-5 bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-border-dark">
                      <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-primary">lock</span>
                          <span className="font-bold text-sm">Privacy Settings</span>
                      </div>
                      <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                  </button>
                  <button onClick={() => setViewMode('chats_settings')} className="w-full flex items-center justify-between p-5 bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-border-dark">
                      <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-primary">palette</span>
                          <span className="font-bold text-sm">Appearance & Wallpaper</span>
                      </div>
                      <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                  </button>
                  <button onClick={toggleDarkMode} className="w-full flex items-center justify-between p-5 bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-border-dark">
                      <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-primary">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                          <span className="font-bold text-sm">Toggle {isDarkMode ? 'Light' : 'Dark'} Mode</span>
                      </div>
                  </button>
                  <div className="pt-6">
                      <button onClick={logout} className="w-full h-14 bg-red-500/10 text-red-500 rounded-full font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                          Log Out
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (viewMode === 'privacy') {
    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark animate-in slide-in-from-right">
            {renderSubHeader("Privacy", () => setViewMode('settings'))}
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-card-dark rounded-2xl">
                    <div>
                        <p className="font-bold text-sm">Last Seen</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{user.privacySettings?.lastSeen || 'Everyone'}</p>
                    </div>
                    <button onClick={() => handlePrivacyToggle('lastSeen', user.privacySettings?.lastSeen)} className={`w-12 h-6 rounded-full transition-all relative ${user.privacySettings?.lastSeen !== 'nobody' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.privacySettings?.lastSeen !== 'nobody' ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-white dark:bg-card-dark rounded-2xl">
                    <div>
                        <p className="font-bold text-sm">Read Receipts</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Double blue ticks</p>
                    </div>
                    <button onClick={() => handlePrivacyToggle('readReceipts', user.privacySettings?.readReceipts)} className={`w-12 h-6 rounded-full transition-all relative ${user.privacySettings?.readReceipts ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.privacySettings?.readReceipts ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>
            </div>
        </div>
    );
  }

  if (viewMode === 'chats_settings') {
    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark animate-in slide-in-from-right">
            {renderSubHeader("Chat Appearance", () => setViewMode('settings'))}
            <div className="p-6 space-y-6">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Global Wallpapers</h4>
                <div className="grid grid-cols-3 gap-3">
                    {['default', 'indigo', 'dark'].map(wp => (
                        <button key={wp} onClick={() => handleWallpaperSelect(wp)} className="aspect-[9/16] rounded-xl border-2 border-transparent hover:border-primary overflow-hidden relative bg-slate-800">
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase">{wp}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white overflow-hidden animate-in fade-in transition-colors duration-300">
        
        <nav className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-gray-200 dark:border-border-dark">
            <div className="flex items-center gap-1 cursor-pointer" onClick={onClose}>
                <span className="material-symbols-outlined text-2xl">arrow_back_ios</span>
            </div>
            <div className="flex flex-col items-center">
                <h2 className="text-sm font-black tracking-tighter uppercase leading-none">@{user.username || user.email.split('@')[0]}</h2>
            </div>
            <div className="flex items-center gap-4">
                <button className="flex items-center justify-center" onClick={() => setViewMode('settings')}>
                    <span className="material-symbols-outlined text-2xl">settings</span>
                </button>
            </div>
        </nav>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
            <section className="px-6 pt-6 pb-4">
                <div className="flex flex-col items-start gap-6">
                    <div className="relative">
                        <div className="absolute -inset-1.5 bg-gradient-to-tr from-primary to-purple-600 rounded-full blur-sm opacity-40 animate-pulse"></div>
                        <div 
                            className="relative bg-center bg-no-repeat aspect-square bg-cover rounded-full h-28 w-28 ring-4 ring-background-light dark:ring-background-dark shadow-2xl"
                            style={{ backgroundImage: `url("${user.photoURL}")` }}
                        ></div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-[26px] font-black tracking-tighter">{user.name}</h1>
                            {(user.isAdmin || user.role === 'owner') && (
                                <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-gray-400 text-sm font-medium leading-relaxed max-w-xs">
                            {user.bio || "Digital Architect & Visual Designer"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                            <span className="material-symbols-outlined text-xs">location_on</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">New York City</span>
                        </div>
                    </div>
                    <div className="flex w-full gap-3 mt-2">
                        <button onClick={() => setViewMode('edit')} className="flex-1 h-12 bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center rounded-full text-xs font-black uppercase tracking-widest border border-slate-300 dark:border-white/10 active:scale-95 transition-all">
                            Edit Profile
                        </button>
                        <button className="flex-1 h-12 bg-primary text-white flex items-center justify-center rounded-full text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                            Share Profile
                        </button>
                    </div>
                </div>
            </section>

            <section className="px-4 py-4">
                <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1 rounded-[1.5rem] bg-slate-100 dark:bg-white/5 py-4 items-center border border-transparent dark:border-white/5">
                        <p className="text-xl font-black">{userPosts.length}</p>
                        <p className="text-slate-500 dark:text-gray-500 text-[10px] uppercase tracking-[0.2em] font-black">Posts</p>
                    </div>
                    <div 
                        onClick={() => onOpenConnections?.('followers')}
                        className="flex-1 flex flex-col gap-1 rounded-[1.5rem] bg-slate-100 dark:bg-white/5 py-4 items-center border border-transparent dark:border-white/5 cursor-pointer active:bg-slate-200 dark:active:bg-white/10 transition-colors"
                    >
                        <p className="text-xl font-black">{(user.followers || []).length}</p>
                        <p className="text-slate-500 dark:text-gray-500 text-[10px] uppercase tracking-[0.2em] font-black">Followers</p>
                    </div>
                    <div 
                        onClick={() => onOpenConnections?.('following')}
                        className="flex-1 flex flex-col gap-1 rounded-[1.5rem] bg-slate-100 dark:bg-white/5 py-4 items-center border border-transparent dark:border-white/5 cursor-pointer active:bg-slate-200 dark:active:bg-white/10 transition-colors"
                    >
                        <p className="text-xl font-black">{(user.following || []).length}</p>
                        <p className="text-slate-500 dark:text-gray-500 text-[10px] uppercase tracking-[0.2em] font-black">Following</p>
                    </div>
                </div>
            </section>

            <section className="mt-4">
                <div className="flex border-b border-gray-200 dark:border-border-dark">
                    <button onClick={() => setActiveTab('grid')} className={`flex-1 flex flex-col items-center justify-center py-4 border-b-2 transition-all ${activeTab === 'grid' ? 'border-primary text-primary' : 'border-transparent text-gray-400 opacity-50'}`}><span className="material-symbols-outlined" style={activeTab === 'grid' ? { fontVariationSettings: "'FILL' 1" } : {}}>grid_view</span></button>
                    <button onClick={() => setActiveTab('reels')} className={`flex-1 flex flex-col items-center justify-center py-4 border-b-2 transition-all ${activeTab === 'reels' ? 'border-primary text-primary' : 'border-transparent text-gray-400 opacity-50'}`}><span className="material-symbols-outlined">video_library</span></button>
                    <button onClick={() => setActiveTab('tagged')} className={`flex-1 flex flex-col items-center justify-center py-4 border-b-2 transition-all ${activeTab === 'tagged' ? 'border-primary text-primary' : 'border-transparent text-gray-400 opacity-50'}`}><span className="material-symbols-outlined">person_pin</span></button>
                </div>
            </section>

            <section className="grid grid-cols-3 gap-0.5 mt-0.5">
                {userPosts.length === 0 ? (
                    <div className="col-span-3 py-20 text-center flex flex-col items-center gap-4 opacity-30">
                        <span className="material-symbols-outlined text-4xl">photo_library</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Post gallery empty</p>
                    </div>
                ) : (
                    userPosts.map(p => (
                        <div key={p.id} onClick={() => onOpenPost?.(p)} className="aspect-square bg-slate-200 dark:bg-white/5 overflow-hidden relative group cursor-pointer active:opacity-70 transition-opacity">
                            {p.mediaType === 'video' ? (
                                <>
                                    <video src={p.mediaUrl} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 right-2"><span className="material-symbols-outlined text-white text-sm">play_circle</span></div>
                                </>
                            ) : (
                                <img src={p.mediaUrl} className="w-full h-full object-cover" alt="" />
                            )}
                        </div>
                    ))
                )}
            </section>
        </main>
        {showSubModal && <SubscriptionModal currentUser={user} onClose={() => setShowSubModal(false)} />}
        <AISelectionModal
            isOpen={showAIModal}
            onClose={() => setShowAIModal(false)}
            title="Select AI Bio"
            options={aiOptions}
            isLoading={isAIGenerating}
            onSelect={setBio}
        />
    </div>
  );
};