import React from 'react';
import { MessageSquare, Phone, CircleDashed, Settings } from 'lucide-react';
import { cn } from '../utils/cn';

interface BottomNavProps {
  activeTab: 'chats' | 'calls' | 'status' | 'settings';
  onTabChange: (tab: 'chats' | 'calls' | 'status' | 'settings') => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="md:hidden h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 shrink-0 z-50 transition-colors duration-500">
      <button
        onClick={() => onTabChange('chats')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all",
          activeTab === 'chats' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-500"
        )}
      >
        <MessageSquare size={24} className={activeTab === 'chats' ? "fill-emerald-600/10" : ""} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Chats</span>
      </button>
      
      <button
        onClick={() => onTabChange('calls')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all",
          activeTab === 'calls' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-500"
        )}
      >
        <Phone size={24} className={activeTab === 'calls' ? "fill-emerald-600/10" : ""} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Calls</span>
      </button>

      <button
        onClick={() => onTabChange('status')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all",
          activeTab === 'status' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-500"
        )}
      >
        <CircleDashed size={24} className={activeTab === 'status' ? "fill-emerald-600/10" : ""} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Status</span>
      </button>

      <button
        onClick={() => onTabChange('settings')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all",
          activeTab === 'settings' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-500"
        )}
      >
        <Settings size={24} className={activeTab === 'settings' ? "fill-emerald-600/10" : ""} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
      </button>
    </div>
  );
};

export default BottomNav;
