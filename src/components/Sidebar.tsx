import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, setDoc, serverTimestamp, limit } from 'firebase/firestore';
import { UserProfile, ChatMetadata, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error-handler';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MessageSquarePlus, LogOut, User, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  onSelectChat: (chat: ChatMetadata) => void;
  activeChatId?: string;
  userProfile: UserProfile;
  onNewChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSelectChat, activeChatId, userProfile, onNewChat }) => {
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const chatData: ChatMetadata[] = [];
        for (const chatDoc of snapshot.docs) {
          const data = chatDoc.data() as ChatMetadata;
          const otherUserId = data.participants.find(id => id !== auth.currentUser?.uid);
          
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              data.otherUser = userDoc.data() as UserProfile;
            }
          }
          chatData.push({ ...data, chatId: chatDoc.id });
        }
        setChats(chatData);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'chats');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, []);

  const filteredChats = chats.filter(chat => 
    chat.otherUser?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.otherUser?.shortId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full md:w-[400px] h-full flex flex-col bg-white border-r border-slate-200">
      {/* Header */}
      <div className="h-16 bg-[#f0f2f5] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden border border-white shadow-sm">
            {userProfile.photoURL ? (
              <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-full h-full p-2 text-slate-500" />
            )}
          </div>
          <div className="flex flex-col">
             <span className="text-sm font-semibold text-slate-900 truncate max-w-[120px]">{userProfile.displayName}</span>
             <span className="text-[10px] font-mono text-emerald-600 font-bold tracking-wider">{userProfile.shortId}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onNewChat}
            className="p-2 text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            title="New Chat"
          >
            <MessageSquarePlus size={20} />
          </button>
          <button 
            onClick={() => auth.signOut()}
            className="p-2 text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 bg-white border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="w-full pl-10 pr-4 py-2 bg-[#f0f2f5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-slate-400 text-sm">No chats found.</p>
            <button 
              onClick={onNewChat}
              className="mt-2 text-emerald-600 text-sm font-semibold hover:underline"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredChats.map((chat) => (
              <button
                key={chat.chatId}
                onClick={() => onSelectChat(chat)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 hover:bg-[#f5f6f6] transition-colors text-left",
                  activeChatId === chat.chatId && "bg-[#ebebeb]"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
                  {chat.otherUser?.photoURL ? (
                    <img src={chat.otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-full h-full p-3 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {chat.otherUser?.displayName || 'Unknown User'}
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      {chat.updatedAt?.toDate ? formatDistanceToNow(chat.updatedAt.toDate(), { addSuffix: false }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 truncate mt-0.5 italic">
                      {chat.lastMessage ? 'Encrypted message' : 'Start chatting...'}
                    </p>
                    <span className="text-[9px] font-mono text-slate-400 ml-2">{chat.otherUser?.shortId}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
