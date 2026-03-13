import React from 'react';
import { NavTab } from './ChatDashboard';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: any;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, currentUser }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] pb-6 pt-3 px-6 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-2xl border-t border-slate-200/50 dark:border-white/5 safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center justify-between">
            <button 
                onClick={() => onTabChange('home')}
                className={`flex flex-col items-center transition-all duration-300 ${activeTab === 'home' ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                <span className="material-symbols-outlined text-[28px]" style={activeTab === 'home' ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
            </button>

            <button 
                onClick={() => onTabChange('search')}
                className={`flex flex-col items-center transition-all duration-300 ${activeTab === 'search' ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                <span className="material-symbols-outlined text-[28px]" style={activeTab === 'search' ? { fontVariationSettings: "'FILL' 1" } : {}}>search</span>
            </button>

            <button 
                onClick={() => onTabChange('reels')}
                className={`flex flex-col items-center transition-all duration-300 ${activeTab === 'reels' ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                <span className="material-symbols-outlined text-[28px]" style={activeTab === 'reels' ? { fontVariationSettings: "'FILL' 1" } : {}}>video_library</span>
            </button>

            <button 
                onClick={() => onTabChange('activity')}
                className={`flex flex-col items-center transition-all duration-300 ${activeTab === 'activity' ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                <span className="material-symbols-outlined text-[28px]" style={activeTab === 'activity' ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
            </button>

            <button 
                onClick={() => onTabChange('profile')}
                className={`flex flex-col items-center transition-all duration-300`}
            >
                <div 
                    className={`w-7 h-7 rounded-full border-2 bg-center bg-cover transition-all duration-300 ${activeTab === 'profile' ? 'border-primary' : 'border-slate-300 dark:border-white/20'}`}
                    style={{ backgroundImage: `url("${currentUser.photoURL}")` }}
                ></div>
            </button>
        </div>
    </nav>
  );
};
