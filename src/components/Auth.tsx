import React from 'react';
import { signIn } from '../firebase';
import { motion } from 'motion/react';
import { MessageSquare, ShieldCheck, Zap } from 'lucide-react';

const Auth: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
          <MessageSquare className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">WhisperChat</h1>
        <p className="text-slate-500 mb-8">Secure, end-to-end encrypted messaging with unique 6-character IDs.</p>

        <div className="space-y-4 mb-8 text-left">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <ShieldCheck className="text-emerald-600 w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900 text-sm">End-to-End Encrypted</p>
              <p className="text-xs text-slate-500">Your messages stay private between you and the recipient.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <Zap className="text-emerald-600 w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Unique 6-Char IDs</p>
              <p className="text-xs text-slate-500">No phone numbers required. Just share your unique ID.</p>
            </div>
          </div>
        </div>

        <button
          onClick={signIn}
          className="w-full py-3 px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-[0.98]"
        >
          Sign in with Google
        </button>
        
        <p className="mt-6 text-xs text-slate-400">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
