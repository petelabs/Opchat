import React from 'react';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { LogOut, User, Bell, Shield, HelpCircle, Moon, Sun, ChevronRight, Camera, Key, MessageSquare, Database, Globe, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';

interface SettingsProps {
  userProfile: UserProfile;
}

const Settings: React.FC<SettingsProps> = ({ userProfile }) => {
  const { theme, toggleTheme } = useTheme();

  const sections = [
    { icon: <Key size={20} />, title: 'Account', subtitle: 'Security notifications, change number', color: 'bg-blue-500' },
    { icon: <Shield size={20} />, title: 'Privacy', subtitle: 'Block contacts, disappearing messages', color: 'bg-emerald-500' },
    { icon: <MessageSquare size={20} />, title: 'Chats', subtitle: 'Theme, wallpapers, chat history', color: 'bg-emerald-600' },
    { icon: <Bell size={20} />, title: 'Notifications', subtitle: 'Message, group & call tones', color: 'bg-red-500' },
    { icon: <Database size={20} />, title: 'Storage and data', subtitle: 'Network usage, auto-download', color: 'bg-emerald-700' },
    { icon: <Globe size={20} />, title: 'App language', subtitle: "English (phone's language)", color: 'bg-slate-500' },
    { icon: <HelpCircle size={20} />, title: 'Help', subtitle: 'Help center, contact us, privacy policy', color: 'bg-slate-400' },
    { icon: <Users size={20} />, title: 'Invite a friend', subtitle: '', color: 'bg-emerald-500' },
  ];

  return (
    <div className="flex-1 h-full bg-white dark:bg-slate-950 overflow-y-auto transition-colors duration-500 scrollbar-hide">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto pb-24">
        {/* Profile Section */}
        <div className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <User size={32} />
                </div>
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 text-white rounded-full shadow-lg border-2 border-white dark:border-slate-900">
              <Camera size={12} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{userProfile.displayName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">Available</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 text-emerald-600 dark:text-emerald-400">
              <ChevronRight size={20} />
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer border-b border-slate-100 dark:border-slate-800" onClick={toggleTheme}>
          <div className="flex items-center gap-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{theme === 'light' ? 'Off' : 'On'}</p>
            </div>
          </div>
          <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors">
             <motion.div 
               animate={{ x: theme === 'light' ? 2 : 22 }}
               className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-md"
             />
          </div>
        </div>

        {/* Settings List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sections.map((section, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer"
            >
              <div className={cn("p-2 text-white rounded-full", section.color)}>
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{section.title}</p>
                {section.subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{section.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="mt-4 px-4">
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-all active:scale-[0.98]"
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>

        <div className="text-center py-12">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">from</p>
          <p className="text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mt-1">Opchat</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
