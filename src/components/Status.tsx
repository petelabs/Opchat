import React from 'react';
import { CircleDashed, Plus, User, Camera, Pencil } from 'lucide-react';

const Status: React.FC = () => {
  return (
    <div className="flex-1 h-full bg-white dark:bg-slate-950 flex flex-col transition-colors duration-500 overflow-y-auto scrollbar-hide">
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Status</h1>
      </div>
      
      <div className="p-4">
        <div className="flex items-center gap-4 p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer rounded-xl">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-slate-200 dark:border-slate-700">
              <User size={24} className="text-slate-400" />
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-600 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md">
              <Plus size={12} className="text-white" />
            </div>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">My status</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tap to add status update</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="px-2 mb-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Recent updates</p>
          </div>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-200 dark:border-slate-800">
              <CircleDashed size={32} className="text-slate-300 dark:text-slate-700" />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-600 max-w-[200px]">No status updates yet. Share what's on your mind.</p>
          </div>
        </div>
      </div>

      {/* FABs for status */}
      <div className="fixed bottom-24 right-6 flex flex-col gap-4 z-20">
        <button className="w-11 h-11 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl shadow-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-90 self-center">
          <Pencil size={20} />
        </button>
        <button className="w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-90">
          <Camera size={24} />
        </button>
      </div>
    </div>
  );
};

export default Status;
