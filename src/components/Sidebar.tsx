import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, setDoc, serverTimestamp, limit } from 'firebase/firestore';
import { UserProfile, ChatMetadata, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error-handler';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MessageSquarePlus, LogOut, User, MoreVertical, Check, CheckCheck, Sun, Moon, Users, Edit3 } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { cn } from '../utils/cn';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

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
          
          if (!data.isGroup) {
            const otherUserId = data.participants.find(id => id !== auth.currentUser?.uid);
            if (otherUserId) {
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              if (userDoc.exists()) {
                data.otherUser = userDoc.data() as UserProfile;
              }
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

  const filteredChats = chats.filter(chat => {
    const search = searchQuery.toLowerCase();
    if (chat.isGroup) {
      return chat.groupName?.toLowerCase().includes(search);
    }
    return chat.otherUser?.displayName.toLowerCase().includes(search) ||
           chat.otherUser?.shortId.toLowerCase().includes(search);
  });

  const formatChatTime = (date: Date) => {
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE');
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 transition-colors duration-500 relative">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 shrink-0">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Chats</h1>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
            <Search size={20} />
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-100 dark:border-slate-700">
            {userProfile.photoURL ? (
              <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <User size={20} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search conversations"
            className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-slate-800 transition-all border border-transparent focus:border-emerald-500/30 dark:text-white"
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
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <p className="text-slate-400 text-sm font-medium">No conversations yet</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredChats.map((chat) => (
              <button
                key={chat.chatId}
                onClick={() => onSelectChat(chat)}
                className={cn(
                  "w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all text-left relative group",
                  activeChatId === chat.chatId && "bg-slate-50 dark:bg-slate-800/50"
                )}
              >
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-sm ring-2 ring-transparent group-hover:ring-emerald-500/20 transition-all">
                    {chat.isGroup ? (
                      chat.groupPhotoURL ? (
                        <img src={chat.groupPhotoURL} alt="Group" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          <Users size={24} />
                        </div>
                      )
                    ) : chat.otherUser?.photoURL ? (
                      <img src={chat.otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        <User size={24} />
                      </div>
                    )}
                  </div>
                  {!chat.isGroup && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 border-b border-slate-100 dark:border-slate-800/50 pb-4 group-last:border-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-[16px] font-bold text-slate-900 dark:text-white truncate">
                      {chat.isGroup ? chat.groupName : (chat.otherUser?.displayName || 'Unknown User')}
                    </h3>
                    <span className={cn(
                      "text-[11px] font-bold",
                      activeChatId === chat.chatId ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
                    )}>
                      {chat.updatedAt?.toDate ? formatChatTime(chat.updatedAt.toDate()) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0">
                      {chat.lastMessage && (
                        <CheckCheck size={14} className="text-emerald-500 shrink-0" />
                      )}
                      <p className="text-[14px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                        {chat.lastMessage ? 'Encrypted message' : 'Start chatting...'}
                      </p>
                    </div>
                    {/* Unread count badge placeholder */}
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <span className="text-[10px] font-black text-white">2</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={onNewChat}
        className="absolute bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-90 z-10 md:bottom-8 md:right-8"
      >
        <Edit3 size={24} />
      </button>
    </div>
  );
};

export default Sidebar;
