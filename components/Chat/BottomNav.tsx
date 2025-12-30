
import React from 'react';
import { NavTab } from './ChatDashboard';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="h-20 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-around px-4 sticky bottom-0 z-50">
      <NavItem 
        label="Chats" 
        isActive={activeTab === 'chats'} 
        onClick={() => onTabChange('chats')}
        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>} 
      />
      <NavItem 
        label="Status" 
        isActive={activeTab === 'status'} 
        onClick={() => onTabChange('status')}
        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>} 
      />
      <NavItem 
        label="Profile" 
        isActive={activeTab === 'profile'} 
        onClick={() => onTabChange('profile')}
        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} 
      />
    </div>
  );
};

const NavItem = ({ label, isActive, onClick, icon }: { label: string, isActive: boolean, onClick: () => void, icon: any }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative py-1 px-4 rounded-2xl ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <div className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-0.5' : 'group-hover:scale-105'}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    {isActive && (
      <div className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.8)]"></div>
    )}
  </button>
);
