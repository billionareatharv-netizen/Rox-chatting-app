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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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
            {notifications.length > 0 ? (
                <>
                    <div className="flex items-center justify-between px-6 pb-2 pt-6">
                        <h3 className="text-black dark:text-white text-lg font-black tracking-tight uppercase">Recent</h3>
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
                                        <div className="size-2 bg-primary rounded-full shrink-0"></div>
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
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full py-40 opacity-40 text-slate-500">
                    <div className="size-20 rounded-full border-4 border-slate-300 dark:border-slate-800 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl">favorite</span>
                    </div>
                    <p className="font-black uppercase tracking-[0.2em] text-xs">No recent activity</p>
                    <p className="text-[10px] font-medium mt-2 text-center max-w-[200px]">When someone likes or follows you, you'll see it here.</p>
                </div>
            )}
        </main>
    </div>
  );
};