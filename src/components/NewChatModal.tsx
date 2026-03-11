import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error-handler';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, UserPlus, AlertCircle, User } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
  const [shortId, setShortId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shortId.length !== 6) return;
    if (shortId.toUpperCase() === (auth.currentUser as any)?.shortId) {
      setError("You cannot chat with yourself.");
      return;
    }

    setLoading(true);
    setError(null);
    setFoundUser(null);

    try {
      const q = query(collection(db, 'users'), where('shortId', '==', shortId.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("User not found. Please check the ID.");
      } else {
        const userData = querySnapshot.docs[0].data() as UserProfile;
        if (userData.uid === auth.currentUser?.uid) {
           setError("You cannot chat with yourself.");
        } else {
           setFoundUser(userData);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  };

  const startChat = async () => {
    if (!foundUser || !auth.currentUser) return;

    setLoading(true);
    try {
      // Check if chat already exists
      const participants = [auth.currentUser.uid, foundUser.uid].sort();
      const chatId = participants.join('_');

      // Create or update chat metadata
      await setDoc(doc(db, 'chats', chatId), {
        chatId,
        participants,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      onChatCreated(chatId);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'chats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <UserPlus size={20} />
                </div>
                <h2 className="font-bold text-lg">Start New Chat</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-emerald-700 rounded-full transition-all active:scale-90">
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Enter the <span className="font-bold text-emerald-600">6-character unique ID</span> of the person you want to chat with. No phone numbers required.
              </p>

              <form onSubmit={handleSearch} className="flex gap-3 mb-8">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="E.g. XJ92K1"
                    maxLength={6}
                    className="w-full pl-5 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xl tracking-[0.3em] uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-inner"
                    value={shortId}
                    onChange={(e) => setShortId(e.target.value.toUpperCase())}
                  />
                </div>
                <button
                  type="submit"
                  disabled={shortId.length !== 6 || loading}
                  className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-emerald-100 active:scale-95"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Search size={24} />
                  )}
                </button>
              </form>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl mb-4 text-sm"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}

              {foundUser && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white overflow-hidden shadow-sm ring-2 ring-emerald-500/10">
                      {foundUser.photoURL ? (
                        <img src={foundUser.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                          <User size={28} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-lg leading-tight">{foundUser.displayName}</p>
                      <p className="text-xs text-emerald-600 font-mono font-black tracking-widest uppercase mt-1">{foundUser.shortId}</p>
                    </div>
                  </div>
                  <button
                    onClick={startChat}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                  >
                    Chat
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NewChatModal;
