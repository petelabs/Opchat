import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, ChatMetadata, OperationType } from './types';
import { handleFirestoreError } from './utils/error-handler';
import { generateShortId } from './utils/crypto';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import NewChatModal from './components/NewChatModal';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Shield, Lock } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<ChatMetadata | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        try {
          // Check if user profile exists
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            // Create new profile with unique shortId
            let shortId = generateShortId();
            let isUnique = false;
            let attempts = 0;

            while (!isUnique && attempts < 5) {
              const shortIdDoc = await getDoc(doc(db, 'shortIds', shortId));
              if (!shortIdDoc.exists()) {
                isUnique = true;
              } else {
                shortId = generateShortId();
                attempts++;
              }
            }

            const newProfile: UserProfile = {
              uid: authUser.uid,
              displayName: authUser.displayName || 'Anonymous',
              shortId: shortId,
              photoURL: authUser.photoURL || undefined,
              createdAt: serverTimestamp(),
            };

            await setDoc(doc(db, 'users', authUser.uid), newProfile);
            await setDoc(doc(db, 'shortIds', shortId), { uid: authUser.uid });
            setUserProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setActiveChat(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-200"
        >
          <MessageSquare className="text-white w-8 h-8" />
        </motion.div>
        <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-full h-full bg-emerald-500"
          />
        </div>
        <p className="mt-4 text-slate-500 text-sm font-medium">WhisperChat is loading...</p>
      </div>
    );
  }

  if (!user || !userProfile) {
    return <Auth />;
  }

  return (
    <ErrorBoundary>
      <div className="h-screen bg-[#f0f2f5] flex items-center justify-center overflow-hidden">
        {/* Main Container */}
        <div className="w-full h-full md:w-[95%] md:h-[95%] md:max-w-[1600px] bg-white shadow-2xl md:rounded-lg flex overflow-hidden relative">
          
          {/* Sidebar - Hidden on mobile when chat is active */}
          <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
            <Sidebar 
              userProfile={userProfile}
              activeChatId={activeChat?.chatId}
              onSelectChat={(chat) => setActiveChat(chat)}
              onNewChat={() => setIsNewChatModalOpen(true)}
            />
          </div>

          {/* Chat Window - Hidden on mobile when no chat is active */}
          <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
            {activeChat ? (
              <ChatWindow 
                chat={activeChat} 
                onBack={() => setActiveChat(null)}
              />
            ) : (
              <div className="flex-1 h-full bg-[#f8f9fa] flex flex-col items-center justify-center p-8 text-center border-b-[6px] border-emerald-500">
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                  <MessageSquare className="text-slate-400 w-12 h-12" />
                </div>
                <h2 className="text-2xl font-light text-slate-600 mb-2">WhisperChat for Web</h2>
                <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                  Send and receive messages without using your phone number. 
                  Your messages are end-to-end encrypted for your privacy.
                </p>
                <div className="mt-auto flex items-center gap-2 text-slate-400 text-xs">
                  <Lock size={12} />
                  End-to-end encrypted
                </div>
              </div>
            )}
          </div>

          {/* Modals */}
          <NewChatModal 
            isOpen={isNewChatModalOpen}
            onClose={() => setIsNewChatModalOpen(false)}
            onChatCreated={async (chatId) => {
              // The Sidebar will automatically update via onSnapshot
              // We'll wait a bit for the chat to appear in the list or just fetch it
              try {
                const chatDoc = await getDoc(doc(db, 'chats', chatId));
                if (chatDoc.exists()) {
                  const data = chatDoc.data() as ChatMetadata;
                  const otherUserId = data.participants.find(id => id !== auth.currentUser?.uid);
                  if (otherUserId) {
                    const userDoc = await getDoc(doc(db, 'users', otherUserId));
                    if (userDoc.exists()) {
                      data.otherUser = userDoc.data() as UserProfile;
                    }
                  }
                  setActiveChat({ ...data, chatId: chatDoc.id });
                }
              } catch (error) {
                console.error("Error selecting new chat:", error);
              }
            }}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
