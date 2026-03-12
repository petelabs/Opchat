import React from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, Video, Plus, Link } from 'lucide-react';

const Calls: React.FC = () => {
  return (
    <div className="flex-1 h-full bg-white dark:bg-slate-950 flex flex-col transition-colors duration-500 overflow-y-auto scrollbar-hide">
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Calls</h1>
      </div>

      <div className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer">
        <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center">
          <Link size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 dark:text-white">Create call link</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Share a link for your Opchat call</p>
        </div>
      </div>

      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Recent</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-12">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Phone size={32} className="text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No call history</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          Your recent voice and video calls will appear here.
        </p>
      </div>

      {/* FAB for new call */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-90 z-20">
        <Plus size={24} />
      </button>
    </div>
  );
};

export default Calls;
