import React from 'react';
import { NavTab } from './ChatDashboard';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: any;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, currentUser }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] pb-8 pt-4 px-8 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5 safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center justify-between">
            <button 
                onClick={() => onTabChange('home')}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'home' ? 'text-primary scale-110' : 'opacity-40 text-slate-500 dark:text-white hover:opacity-70'}`}
            >
                <span className="material-symbols-outlined text-3xl" style={activeTab === 'home' ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
                <div className={`h-1 w-1 bg-primary rounded-full transition-all duration-300 ${activeTab === 'home' ? 'opacity-100' : 'opacity-0'}`}></div>
            </button>

            <button 
                onClick={() => onTabChange('search')}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'search' ? 'text-primary scale-110' : 'opacity-40 text-slate-500 dark:text-white hover:opacity-70'}`}
            >
                <span className="material-symbols-outlined text-3xl" style={activeTab === 'search' ? { fontVariationSettings: "'FILL' 1" } : {}}>search</span>
                <div className={`h-1 w-1 bg-primary rounded-full transition-all duration-300 ${activeTab === 'search' ? 'opacity-100' : 'opacity-0'}`}></div>
            </button>

            <button 
                onClick={() => onTabChange('reels')}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'reels' ? 'text-primary scale-110' : 'opacity-40 text-slate-500 dark:text-white hover:opacity-70'}`}
            >
                <span className="material-symbols-outlined text-3xl" style={activeTab === 'reels' ? { fontVariationSettings: "'FILL' 1" } : {}}>video_library</span>
                <div className={`h-1 w-1 bg-primary rounded-full transition-all duration-300 ${activeTab === 'reels' ? 'opacity-100' : 'opacity-0'}`}></div>
            </button>

            <button 
                onClick={() => onTabChange('activity')}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'activity' ? 'text-primary scale-110' : 'opacity-40 text-slate-500 dark:text-white hover:opacity-70'}`}
            >
                <span className="material-symbols-outlined text-3xl" style={activeTab === 'activity' ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                <div className={`h-1 w-1 bg-primary rounded-full transition-all duration-300 ${activeTab === 'activity' ? 'opacity-100' : 'opacity-0'}`}></div>
            </button>

            <button 
                onClick={() => onTabChange('profile')}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'profile' ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-70'}`}
            >
                <div 
                    className={`w-8 h-8 rounded-full border-2 bg-center bg-cover transition-all duration-300 ${activeTab === 'profile' ? 'border-primary shadow-lg shadow-primary/20' : 'border-slate-400 dark:border-white/40'}`}
                    style={{ backgroundImage: `url("${currentUser.photoURL}")` }}
                ></div>
                <div className={`h-1 w-1 bg-primary rounded-full transition-all duration-300 ${activeTab === 'profile' ? 'opacity-100' : 'opacity-0'}`}></div>
            </button>
        </div>
    </nav>
  );
};