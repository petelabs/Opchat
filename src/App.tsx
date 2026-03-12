import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { UserProfile, ChatMetadata, OperationType, Call } from './types';
import { handleFirestoreError } from './utils/error-handler';
import { generateShortId } from './utils/crypto';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import NewChatModal from './components/NewChatModal';
import CallModal from './components/CallModal';
import Settings from './components/Settings';
import Calls from './components/Calls';
import Status from './components/Status';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Shield, Lock } from 'lucide-react';
import { requestNotificationPermission, showNotification } from './utils/notifications';
import { decryptMessage } from './utils/crypto';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<ChatMetadata | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isGettingReady, setIsGettingReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'status' | 'settings'>('chats');
  
  // Call states
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callOtherUser, setCallOtherUser] = useState<UserProfile | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<Call | undefined>(undefined);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        setIsGettingReady(true);
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
              photoURL: authUser.photoURL || null,
              createdAt: serverTimestamp(),
            };

            await setDoc(doc(db, 'users', authUser.uid), newProfile);
            await setDoc(doc(db, 'shortIds', shortId), { uid: authUser.uid });
            setUserProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'users');
        } finally {
          setTimeout(() => setIsGettingReady(false), 1500);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setActiveChat(null);
        setIsGettingReady(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for new messages across all chats for notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'modified') {
          const chatData = change.doc.data() as ChatMetadata;
          // Only notify if it's a new message and not from the current user
          // and the chat is not currently active
          if (chatData.lastMessage && activeChat?.chatId !== change.doc.id) {
            // We need to know who sent the last message to avoid notifying self
            // For now, we'll just decrypt and show if it's not the active chat
            // In a real app, you'd store lastMessageSenderId
            
            const decrypted = decryptMessage(chatData.lastMessage, change.doc.id);
            let senderName = 'New Message';
            
            if (!chatData.isGroup) {
              const otherUserId = chatData.participants.find(id => id !== user.uid);
              if (otherUserId) {
                const userDoc = await getDoc(doc(db, 'users', otherUserId));
                if (userDoc.exists()) {
                  senderName = (userDoc.data() as UserProfile).displayName;
                }
              }
            } else {
              senderName = chatData.groupName || 'Group Message';
            }

            showNotification(senderName, decrypted, undefined, change.doc.id);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, activeChat]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'offering'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const callData = snapshot.docs[0].data() as Call;
        // Fetch caller profile
        const callerDoc = await getDoc(doc(db, 'users', callData.callerId));
        if (callerDoc.exists()) {
          setCallOtherUser(callerDoc.data() as UserProfile);
          setIncomingCallData(callData);
          setIsIncomingCall(true);
          setIsCallModalOpen(true);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleStartCall = (otherUser: UserProfile) => {
    setCallOtherUser(otherUser);
    setIsIncomingCall(false);
    setIncomingCallData(undefined);
    setIsCallModalOpen(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'calls':
        return <Calls />;
      case 'status':
        return <Status />;
      case 'settings':
        return userProfile ? <Settings userProfile={userProfile} /> : null;
      default:
        return (
          <Sidebar 
            userProfile={userProfile!}
            activeChatId={activeChat?.chatId}
            onSelectChat={(chat) => setActiveChat(chat)}
            onNewChat={() => setIsNewChatModalOpen(true)}
          />
        );
    }
  };

  if (loading || isGettingReady) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] dark:bg-slate-950 flex flex-col items-center justify-center transition-colors duration-500">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-emerald-200 dark:shadow-emerald-900/20"
        >
          <MessageSquare className="text-white w-10 h-10" />
        </motion.div>
        <div className="w-56 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-full h-full bg-emerald-600"
          />
        </div>
        <p className="mt-6 text-slate-500 dark:text-slate-400 text-sm font-bold tracking-widest uppercase">
          {isGettingReady ? 'Account ready! Opening chats...' : 'Opchat is loading'}
        </p>
      </div>
    );
  }

  if (!user || !userProfile) {
    return <Auth />;
  }

  return (
    <ErrorBoundary>
      <div className="h-screen bg-[#f0f2f5] dark:bg-slate-950 flex items-center justify-center overflow-hidden font-sans transition-colors duration-500">
        {/* Main Container */}
        <div className="w-full h-full md:w-[98%] md:h-[96%] md:max-w-[1700px] bg-white dark:bg-slate-900 shadow-2xl md:rounded-[2rem] flex flex-col md:flex-row overflow-hidden relative border border-slate-200/50 dark:border-slate-800/50">
          
          {/* Sidebar Area */}
          <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-[400px] h-full flex-col border-r border-slate-200 dark:border-slate-800`}>
            <div className="flex-1 overflow-hidden">
              {renderContent()}
            </div>
            <BottomNav activeTab={activeTab} onTabChange={(tab) => {
              setActiveTab(tab);
              setActiveChat(null);
            }} />
          </div>

          {/* Chat Area */}
          <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
            {activeChat ? (
              <ChatWindow 
                chat={activeChat} 
                onBack={() => setActiveChat(null)}
                onCall={() => activeChat.otherUser && handleStartCall(activeChat.otherUser)}
              />
            ) : (
              <div className="flex-1 h-full bg-[#f8f9fa] dark:bg-slate-900/50 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-50 dark:bg-emerald-900/10 rounded-full -mr-48 -mt-48 blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-50 dark:bg-emerald-900/10 rounded-full -ml-48 -mb-48 blur-3xl opacity-50"></div>
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative z-10"
                >
                  <div className="w-28 h-28 bg-white dark:bg-slate-800 shadow-xl rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-slate-100 dark:border-slate-700">
                    <MessageSquare className="text-emerald-600 w-12 h-12" />
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Opchat for Web</h2>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md leading-relaxed text-lg font-medium">
                    Experience professional-grade, end-to-end encrypted messaging. 
                    No phone numbers. Pure privacy.
                  </p>
                  
                  <button 
                    onClick={() => setIsNewChatModalOpen(true)}
                    className="mt-10 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-emerald-900/20 active:scale-95"
                  >
                    Start a New Conversation
                  </button>
                </motion.div>

                <div className="absolute bottom-12 flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-bold uppercase tracking-widest">
                  <Shield className="w-4 h-4 text-emerald-500" />
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
              try {
                const chatDoc = await getDoc(doc(db, 'chats', chatId));
                if (chatDoc.exists()) {
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
                  setActiveChat({ ...data, chatId: chatDoc.id });
                  setActiveTab('chats');
                }
              } catch (error) {
                console.error("Error selecting new chat:", error);
              }
            }}
          />

          {callOtherUser && (
            <CallModal
              isOpen={isCallModalOpen}
              onClose={() => setIsCallModalOpen(false)}
              otherUser={callOtherUser}
              isIncoming={isIncomingCall}
              incomingCallData={incomingCallData}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
