import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ChatMetadata, Message, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error-handler';
import { encryptMessage, decryptMessage } from '../utils/crypto';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, MoreVertical, Shield, Lock, ArrowLeft, Paperclip, Smile, Check, CheckCheck, Search, Video, Image as ImageIcon, X, Users, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../utils/cn';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ChatWindowProps {
  chat: ChatMetadata;
  onBack?: () => void;
  onCall: (type: 'audio' | 'video') => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack, onCall }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const q = query(
      collection(db, 'chats', chat.chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const messageData: Message[] = [];
        snapshot.docs.forEach((doc) => {
          messageData.push({ ...doc.data() as Message, messageId: doc.id });
        });
        setMessages(messageData);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `chats/${chat.chatId}/messages`);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chat.chatId}/messages`);
    });

    return () => unsubscribe();
  }, [chat.chatId]);

  const handleSendMessage = async (e?: React.FormEvent, mediaData?: { url: string, name: string, type: 'image' | 'file' }) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !mediaData && !isUploading) return;

    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      const encrypted = encryptMessage(mediaData ? `[${mediaData.type}]` : textToSend, chat.chatId);
      
      const messageData: any = {
        chatId: chat.chatId,
        senderId: auth.currentUser?.uid,
        encryptedContent: encrypted,
        timestamp: serverTimestamp(),
        type: mediaData ? mediaData.type : 'text',
      };

      if (mediaData) {
        messageData.mediaUrl = mediaData.url;
        messageData.mediaName = mediaData.name;
      }

      await addDoc(collection(db, 'chats', chat.chatId, 'messages'), messageData);
      
      // Update chat metadata
      await updateDoc(doc(db, 'chats', chat.chatId), {
        lastMessage: encrypted,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chat.chatId}/messages`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB allowed.");
      return;
    }

    setIsUploading(true);

    try {
      const storageRef = ref(storage, `chats/${chat.chatId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      await handleSendMessage(undefined, {
        url,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'file'
      });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#efeae2] dark:bg-slate-950 relative overflow-hidden transition-colors duration-500">
      {/* Background Pattern Overlay - WhatsApp style doodle */}
      <div 
        className="absolute inset-0 opacity-[0.08] dark:opacity-[0.03] pointer-events-none"
        style={{ 
          backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
          backgroundSize: '400px'
        }}
      ></div>

      {/* Header */}
      <div className="h-16 bg-white dark:bg-slate-900 flex items-center justify-between px-4 shrink-0 z-10 shadow-sm border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-100 dark:border-slate-700">
            {chat.isGroup ? (
              chat.groupPhotoURL ? (
                <img src={chat.groupPhotoURL} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <Users size={20} />
                </div>
              )
            ) : chat.otherUser?.photoURL ? (
              <img src={chat.otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <User size={20} />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              {chat.isGroup ? chat.groupName : chat.otherUser?.displayName}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 uppercase tracking-wider">
              {chat.isGroup ? `${chat.participants.length} members` : 'Online'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!chat.isGroup && (
            <>
              <button 
                onClick={() => onCall('video')}
                className="p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90"
                title="Video Call"
              >
                <Video size={20} />
              </button>
              <button 
                onClick={() => onCall('audio')}
                className="p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90"
                title="Voice Call"
              >
                <Phone size={20} />
              </button>
            </>
          )}
          <button className="p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90">
            <Search size={20} />
          </button>
          <button className="p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:px-12 space-y-2 z-10 scrollbar-hide"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-[11px] text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-xl shadow-sm flex items-center gap-2 border border-slate-100 dark:border-slate-700 font-bold uppercase tracking-widest">
            <Lock size={12} className="shrink-0 text-emerald-500" />
            End-to-end encrypted
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === auth.currentUser?.uid;
            const decrypted = decryptMessage(msg.encryptedContent, chat.chatId);
            const time = msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'h:mm a') : '';

            return (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                key={msg.messageId || idx}
                className={cn(
                  "flex w-full",
                  isMe ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] md:max-w-[70%] px-2.5 py-1.5 rounded-xl shadow-sm relative group",
                    isMe 
                      ? "bg-[#d9fdd3] dark:bg-emerald-700 dark:text-white rounded-tr-none" 
                      : "bg-white dark:bg-slate-800 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-700"
                  )}
                >
                  {msg.type === 'image' ? (
                    <div className="mb-1 rounded-lg overflow-hidden border border-black/5 dark:border-white/5">
                      <img src={msg.mediaUrl} alt="Media" className="max-w-full h-auto max-h-96 object-contain bg-slate-100 dark:bg-slate-900" />
                    </div>
                  ) : msg.type === 'file' ? (
                    <a 
                      href={msg.mediaUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl mb-1 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                    >
                      <Paperclip size={20} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{msg.mediaName}</p>
                        <p className="text-[10px] opacity-60 uppercase font-bold tracking-widest">Download File</p>
                      </div>
                    </a>
                  ) : (
                    <p className={cn(
                      "text-[14px] whitespace-pre-wrap break-words pr-16 leading-relaxed",
                      isMe ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-white"
                    )}>
                      {decrypted}
                    </p>
                  )}
                  <div className="absolute bottom-1 right-2 flex items-center gap-1">
                    <span className={cn(
                      "text-[10px] font-medium",
                      isMe ? "text-emerald-700/60 dark:text-emerald-100/60" : "text-slate-400 dark:text-slate-500"
                    )}>
                      {time}
                    </span>
                    {isMe && (
                      <span className="text-emerald-500">
                        <CheckCheck size={14} />
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-slate-900 p-3 shrink-0 z-10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-5xl mx-auto">
          <div className="flex items-center gap-1">
            <button type="button" className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Smile size={24} />
            </button>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <Paperclip size={24} />
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message"
              className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-2xl flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={(!newMessage.trim() && !isUploading) || isUploading}
            className={cn(
              "p-3 rounded-full transition-all shadow-lg",
              (newMessage.trim() || isUploading)
                ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-90" 
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            )}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
