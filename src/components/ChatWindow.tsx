import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ChatMetadata, Message, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error-handler';
import { encryptMessage, decryptMessage } from '../utils/crypto';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, MoreVertical, Shield, Lock, ArrowLeft, Paperclip, Smile, Check } from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatWindowProps {
  chat: ChatMetadata;
  onBack?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      const encrypted = encryptMessage(textToSend, chat.chatId);
      
      const messageData = {
        chatId: chat.chatId,
        senderId: auth.currentUser.uid,
        encryptedContent: encrypted,
        timestamp: serverTimestamp(),
        messageId: '' // Will be set by Firestore
      };

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

  return (
    <div className="flex-1 h-full flex flex-col bg-[#efeae2] relative overflow-hidden">
      {/* Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      {/* Header */}
      <div className="h-16 bg-[#f0f2f5] flex items-center justify-between px-4 shrink-0 border-b border-slate-200 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden border border-white shadow-sm">
            {chat.otherUser?.photoURL ? (
              <img src={chat.otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-full h-full p-2 text-slate-500" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">{chat.otherUser?.displayName}</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Shield size={10} className="text-emerald-600" />
              End-to-End Encrypted
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:px-8 space-y-2 z-10">
        <div className="flex justify-center mb-4">
          <div className="bg-[#fff9c2] text-[11px] text-slate-600 px-3 py-1 rounded-lg shadow-sm flex items-center gap-2 border border-[#e6e0a4]">
            <Lock size={10} />
            Messages are end-to-end encrypted. No one outside of this chat can read them.
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
            const time = msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : '';

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
                    "max-w-[85%] md:max-w-[70%] px-3 py-1.5 rounded-lg shadow-sm relative group",
                    isMe ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"
                  )}
                >
                  <p className="text-sm text-slate-900 whitespace-pre-wrap break-words pr-12">
                    {decrypted}
                  </p>
                  <div className="absolute bottom-1 right-2 flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">
                      {time}
                    </span>
                    {isMe && (
                      <span className="text-emerald-500">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-[#f0f2f5] p-3 shrink-0 border-t border-slate-200 z-10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-5xl mx-auto">
          <button type="button" className="p-2 text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <Smile size={24} />
          </button>
          <button type="button" className="p-2 text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <Paperclip size={24} />
          </button>
          <input
            type="text"
            placeholder="Type a message"
            className="flex-1 bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none shadow-sm border border-transparent focus:border-emerald-500 transition-all"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={cn(
              "p-3 rounded-full transition-all shadow-md",
              newMessage.trim() 
                ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-90" 
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
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
