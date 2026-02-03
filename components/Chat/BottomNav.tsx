
import React from 'react';
import { NavTab } from './ChatDashboard';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: any;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, currentUser }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] pb-8 pt-3 px-6 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center justify-between">
            <button 
                onClick={() => onTabChange('home')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-primary' : 'opacity-40 text-slate-500 dark:text-white'}`}
            >
                <span className="material-symbols-outlined text-3xl" style={activeTab === 'home' ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
                {activeTab === 'home' && <div className="h-1 w-1 bg-primary rounded-full"></div>}
            </button>

            <button 
                onClick={() => onTabChange('search')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'search' ? 'text-primary' : 'opacity-40 text-slate-500 dark:text-white'}`}
            >
                <span className="material-symbols-outlined text-3xl" style={activeTab === 'search' ? { fontVariationSettings: "'FILL' 1" } : {}}>search</span>
            </button>

            <button 
                onClick={() => onTabChange('add')}
                className="flex items-center justify-center bg-primary size-12 rounded-full shadow-lg shadow-primary/20 -mt-8 border-4 border-background-light dark:border-background-dark active:scale-90 transition-transform"
            >
                <span className="material-symbols-outlined text-white text-3xl font-bold">add</span>
            </button>

            <button 
                onClick={() => onTabChange('activity')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'activity' ? 'text-primary' : 'opacity-40 text-slate-500 dark:text-white'}`}
            >
                <span className="material-symbols-outlined text-3xl" style={activeTab === 'activity' ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                {activeTab === 'activity' && <div className="h-1 w-1 bg-primary rounded-full"></div>}
            </button>

            <button 
                onClick={() => onTabChange('profile')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'opacity-100' : 'opacity-40'}`}
            >
                <div 
                    className={`w-8 h-8 rounded-full border-2 bg-center bg-cover ${activeTab === 'profile' ? 'border-primary shadow-lg' : 'border-slate-400 dark:border-white/40'}`}
                    style={{ backgroundImage: `url("${currentUser.photoURL}")` }}
                ></div>
            </button>
        </div>
    </nav>
  );
};
