
import React, { useState } from 'react';
import { User } from '../../types';

interface ActivityViewProps {
  onBack: () => void;
  onOpenProfile: (user: User) => void;
}

interface NotificationItem {
    id: string;
    user: {
        name: string;
        photo: string;
    };
    action: string;
    timestamp: string;
    unread?: boolean;
    mediaPreview?: string;
    isFollow?: boolean;
    following?: boolean;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ onBack, onOpenProfile }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { 
        id: 'n1', 
        user: { name: 'sarah_j', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhaD-YnmC15AO4cj6L3PqmS1YbAt5B3WhpSIYZxBn51jeTrOM82_z7zhXdE-3tLMplPhcjLqJT_HY-2LJA_fKDBXjFacfHBhttQsqaElYZAnjKZmpM6brtimwbV3vYwxi2vuYxxvGycjPCZ_vYMlbW6C6Erpe6cwwrIlEiObndlo7rddgxzfSBVDdPJRv3EeGGLi1plyd2KoPovJnUoK6pAofJcSZD9bMa4xubM3Wf7OBS93cDV1RP1xYoJsoHS5nIzNBuP2b2' },
        action: 'liked your photo.',
        timestamp: '2m',
        unread: true,
        mediaPreview: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOfSaQyMgo0gO49QKUR3D91P-AsveOPCyziTf7ZWWEIks2EZ642c5BoeLLt2FUg_N71NJQgoFFJFDprHyInsbT4FxtI5aSbJp-Vb9uFb2jUeKnPUhLAgTHDS1td18aR3YPT7qTDpwoYGGxTgkGeTzRgfVsha61vmPAFmjWVHP27Eedxy3HR3h2B3WNCmh0sOWTHw_IDlURj2cLAJAkcz8Yrl7kaMxgOBUCzphElr3REaif8lIt-5VTcBQIUDNrvGM2gLj_dUHK'
    },
    {
        id: 'n2',
        user: { name: 'marcus.tech', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbotOO2CtyWubCoWKWQOiCUvjJjLhqqcd5j_R08UaBgZ6ZkuKzIa5K0WTQINJUEyL57_WXs6a2tA9woQaaXsPWKr-Kz43HWCfuztqzXiDMGkN8oxUzLTrd3bE9zlGtYJKOzSBAzm280BkNaRH-4wcvXKep3Q5QELVr3iNQt3BSnMU3okicZ2DtO105jFoM1pSqgoF3KjKJbnWqHaOCUb_1hSC8bOEryFG93mZDEGwm2Z7h6N6xdNQeGvQrYA-gpoWy29gFSzon' },
        action: 'started following you.',
        timestamp: '5h',
        isFollow: true,
        following: false
    }
  ]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const toggleFollow = (id: string) => {
    setNotifications(prev => prev.map(n => {
        if(n.id === id) return { ...n, following: !n.following };
        return n;
    }));
  };

  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark text-black dark:text-white transition-colors duration-300 animate-in fade-in overflow-hidden h-[100dvh]">
        {/* TopAppBar */}
        <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between shrink-0">
            <button onClick={onBack} className="text-black dark:text-white flex size-12 shrink-0 items-center justify-start active:scale-90 transition-transform">
                <span className="material-symbols-outlined text-[28px]">arrow_back_ios</span>
            </button>
            <h2 className="text-black dark:text-white text-lg font-black leading-tight tracking-tighter flex-1 text-center uppercase">Activity</h2>
            <div className="flex w-12 items-center justify-end">
                <button className="flex cursor-pointer items-center justify-center rounded-full h-12 bg-transparent text-black dark:text-white active:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-[28px]">tune</span>
                </button>
            </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto pb-24 no-scrollbar">
            {/* Section: Today */}
            <div className="flex items-center justify-between px-6 pb-2 pt-6">
                <h3 className="text-black dark:text-white text-lg font-black tracking-tight uppercase">Today</h3>
                <button onClick={markAllRead} className="text-primary text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity">Mark all as read</button>
            </div>

            <div className="flex flex-col">
                {notifications.map((notif) => (
                    <div 
                        key={notif.id}
                        className="flex items-center gap-3 px-6 min-h-[85px] py-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4 flex-1">
                            {notif.unread ? (
                                <div className="size-2 bg-accent-blue rounded-full shrink-0"></div>
                            ) : (
                                <div className="size-2 shrink-0"></div>
                            )}
                            
                            <img 
                                src={notif.user.photo} 
                                className={`size-12 rounded-full object-cover border-2 ${notif.unread ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent'}`} 
                                alt="" 
                            />

                            <div className="flex flex-col justify-center flex-1 min-w-0">
                                <p className="text-black dark:text-white text-[14px] leading-tight font-medium">
                                    <span className="font-black">@{notif.user.name}</span> {notif.action}
                                </p>
                                <p className="text-gray-500 dark:text-[#ba9cab] text-[10px] font-black uppercase tracking-widest mt-1.5">{notif.timestamp} ago</p>
                            </div>
                        </div>

                        {notif.mediaPreview && (
                            <div className="shrink-0 ml-2">
                                <img src={notif.mediaPreview} className="size-12 rounded-xl object-cover shadow-md" alt="" />
                            </div>
                        )}

                        {notif.isFollow && (
                            <div className="shrink-0">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleFollow(notif.id); }}
                                    className={`flex min-w-[100px] items-center justify-center rounded-full h-9 px-4 text-xs font-black uppercase tracking-widest transition-all ${notif.following ? 'bg-slate-200 dark:bg-white/10 text-black dark:text-white border border-transparent' : 'bg-primary text-white shadow-lg shadow-primary/20 active:scale-95'}`}
                                >
                                    {notif.following ? 'Following' : 'Follow back'}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Section: This Week - Static Mocks for UI consistency */}
            <div className="h-4 bg-slate-50 dark:bg-white/5 my-4"></div>
            <h3 className="text-black dark:text-white text-lg font-black tracking-tight uppercase px-6 pb-2 pt-4">This Week</h3>
            
            <div className="flex flex-col">
                {/* ListItem: Multiple Likes */}
                <div className="flex items-center gap-3 px-6 min-h-[85px] py-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="size-2 shrink-0"></div>
                        <div className="relative h-12 w-12 shrink-0">
                            <div className="absolute top-0 right-0 size-9 rounded-full border-2 border-background-dark overflow-hidden bg-slate-800">
                                <img src="https://picsum.photos/seed/n1/100" className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="absolute bottom-0 left-0 size-9 rounded-full border-2 border-background-dark overflow-hidden bg-slate-800">
                                <img src="https://picsum.photos/seed/n2/100" className="w-full h-full object-cover" alt="" />
                            </div>
                        </div>
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                            <p className="text-black dark:text-white text-[14px] leading-tight font-medium">
                                <span className="font-black">elara_v</span> and 12 others liked your post.
                            </p>
                            <p className="text-gray-500 dark:text-[#ba9cab] text-[10px] font-black uppercase mt-1.5">2d ago</p>
                        </div>
                    </div>
                    <img src="https://picsum.photos/seed/p1/100" className="size-12 rounded-xl object-cover" alt="" />
                </div>

                {/* ListItem: Comment */}
                <div className="flex items-center gap-3 px-6 min-h-[85px] py-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="size-2 shrink-0"></div>
                        <img src="https://picsum.photos/seed/n4/100" className="size-12 rounded-full object-cover" alt="" />
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                            <p className="text-black dark:text-white text-[14px] leading-tight font-medium">
                                <span className="font-black">jenny_sky</span> commented: "Absolutely stunning view! 🔥"
                            </p>
                            <p className="text-gray-500 dark:text-[#ba9cab] text-[10px] font-black uppercase mt-1.5">4d ago</p>
                        </div>
                    </div>
                    <img src="https://picsum.photos/seed/p2/100" className="size-12 rounded-xl object-cover" alt="" />
                </div>
            </div>

            {/* Earlier Section */}
            <div className="h-4 bg-slate-50 dark:bg-white/5 my-4"></div>
            <h3 className="text-black dark:text-white text-lg font-black tracking-tight uppercase px-6 pb-2 pt-4">Earlier</h3>
            
            <div className="flex flex-col pb-10">
                <div className="flex items-center gap-3 px-6 min-h-[85px] py-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="size-2 shrink-0"></div>
                        <img src="https://picsum.photos/seed/n5/100" className="size-12 rounded-full object-cover" alt="" />
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                            <p className="text-black dark:text-white text-[14px] leading-tight font-medium">
                                <span className="font-black">david_travels</span> mentioned you in a comment.
                            </p>
                            <p className="text-gray-500 dark:text-[#ba9cab] text-[10px] font-black uppercase mt-1.5">1w ago</p>
                        </div>
                    </div>
                    <div className="size-12 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-sm">alternate_email</span>
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
};
