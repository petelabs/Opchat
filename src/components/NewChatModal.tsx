import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error-handler';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, UserPlus, AlertCircle, User, Users, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [shortId, setShortId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shortId.length !== 6) return;
    
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
           setError("You cannot add yourself.");
        } else if (groupMembers.some(m => m.uid === userData.uid)) {
           setError("User already added to group.");
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

  const addMember = () => {
    if (foundUser) {
      setGroupMembers([...groupMembers, foundUser]);
      setFoundUser(null);
      setShortId('');
    }
  };

  const removeMember = (uid: string) => {
    setGroupMembers(groupMembers.filter(m => m.uid !== uid));
  };

  const startChat = async () => {
    if (mode === 'direct') {
      if (!foundUser || !auth.currentUser) return;
      setLoading(true);
      try {
        const participants = [auth.currentUser.uid, foundUser.uid].sort();
        const chatId = participants.join('_');
        await setDoc(doc(db, 'chats', chatId), {
          chatId,
          participants,
          updatedAt: serverTimestamp(),
          isGroup: false
        }, { merge: true });
        onChatCreated(chatId);
        onClose();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'chats');
      } finally {
        setLoading(false);
      }
    } else {
      if (!groupName || groupMembers.length === 0 || !auth.currentUser) return;
      setLoading(true);
      try {
        const participants = [auth.currentUser.uid, ...groupMembers.map(m => m.uid)];
        const chatId = `group_${Date.now()}_${auth.currentUser.uid}`;
        await setDoc(doc(db, 'chats', chatId), {
          chatId,
          participants,
          updatedAt: serverTimestamp(),
          isGroup: true,
          groupName,
          groupAdmin: auth.currentUser.uid
        });
        onChatCreated(chatId);
        onClose();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'chats');
      } finally {
        setLoading(false);
      }
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
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-colors"
          >
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  {mode === 'direct' ? <UserPlus size={20} /> : <Users size={20} />}
                </div>
                <h2 className="font-bold text-lg">{mode === 'direct' ? 'Start New Chat' : 'Create New Group'}</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-emerald-700 rounded-full transition-all active:scale-90">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
                <button
                  onClick={() => setMode('direct')}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                    mode === 'direct' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-slate-500"
                  )}
                >
                  Direct
                </button>
                <button
                  onClick={() => setMode('group')}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                    mode === 'group' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-slate-500"
                  )}
                >
                  Group
                </button>
              </div>

              {mode === 'group' && (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Group Name</label>
                  <input
                    type="text"
                    placeholder="Enter group name"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
              )}

              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                {mode === 'direct' ? 'Find User by ID' : 'Add Members by ID'}
              </label>
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="XJ92K1"
                  maxLength={6}
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all"
                  value={shortId}
                  onChange={(e) => setShortId(e.target.value.toUpperCase())}
                />
                <button
                  type="submit"
                  disabled={shortId.length !== 6 || loading}
                  className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-slate-200 transition-all active:scale-95"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Search size={20} />}
                </button>
              </form>

              {error && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-4 text-xs font-medium">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {foundUser && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
                      {foundUser.photoURL ? (
                        <img src={foundUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                          <User size={18} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{foundUser.displayName}</p>
                      <p className="text-[10px] text-emerald-600 font-mono font-black">{foundUser.shortId}</p>
                    </div>
                  </div>
                  <button
                    onClick={mode === 'direct' ? startChat : addMember}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all"
                  >
                    {mode === 'direct' ? 'Chat' : 'Add'}
                  </button>
                </div>
              )}

              {mode === 'group' && groupMembers.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Members ({groupMembers.length})</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {groupMembers.map(member => (
                      <div key={member.uid} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{member.displayName}</span>
                        <button onClick={() => removeMember(member.uid)} className="text-slate-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'group' && (
                <button
                  onClick={startChat}
                  disabled={!groupName || groupMembers.length === 0 || loading}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all shadow-xl shadow-emerald-100 dark:shadow-none active:scale-95"
                >
                  Create Group
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NewChatModal;
