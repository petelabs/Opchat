import React, { useEffect, useRef, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Call, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User, Shield } from 'lucide-react';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser: UserProfile;
  isIncoming: boolean;
  incomingCallData?: Call;
}

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const CallModal: React.FC<CallModalProps> = ({ isOpen, onClose, otherUser, isIncoming, incomingCallData }) => {
  const [status, setStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callIdRef = useRef<string | null>(incomingCallData?.callId || null);

  useEffect(() => {
    if (isOpen) {
      startCall();
    } else {
      cleanup();
    }
    return () => {
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (callIdRef.current) {
      const id = callIdRef.current;
      updateDoc(doc(db, 'calls', id), { status: 'ended' }).catch(console.error);
    }
    setLocalStream(null);
    setRemoteStream(null);
    setStatus('ended');
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      pc.current = new RTCPeerConnection(servers);
      const remote = new MediaStream();
      setRemoteStream(remote);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;

      stream.getTracks().forEach((track) => {
        pc.current?.addTrack(track, stream);
      });

      pc.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remote.addTrack(track);
        });
      };

      if (isIncoming && incomingCallData) {
        setStatus('ringing');
        // Logic for answering will be triggered by user clicking "Answer"
      } else {
        setStatus('ringing');
        const callDoc = doc(collection(db, 'calls'));
        callIdRef.current = callDoc.id;

        pc.current.onicecandidate = (event) => {
          if (event.candidate) {
            addDoc(collection(db, 'calls', callDoc.id, 'candidates'), {
              candidate: event.candidate.toJSON(),
              senderId: auth.currentUser?.uid,
              timestamp: serverTimestamp(),
            });
          }
        };

        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        const callData: Call = {
          callId: callDoc.id,
          callerId: auth.currentUser?.uid!,
          receiverId: otherUser.uid,
          status: 'offering',
          type: 'video',
          offer: {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
          },
          createdAt: serverTimestamp(),
        };

        await setDoc(callDoc, callData);

        onSnapshot(callDoc, (snapshot) => {
          const data = snapshot.data() as Call;
          if (data?.answer && !pc.current?.currentRemoteDescription) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.current?.setRemoteDescription(answerDescription);
            setStatus('active');
          }
          if (data?.status === 'ended' || data?.status === 'rejected') {
            onClose();
          }
        });

        onSnapshot(collection(db, 'calls', callDoc.id, 'candidates'), (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              if (data.senderId !== auth.currentUser?.uid) {
                pc.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
              }
            }
          });
        });
      }
    } catch (err) {
      console.error('Failed to start call:', err);
      onClose();
    }
  };

  const answerCall = async () => {
    if (!pc.current || !incomingCallData) return;

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(collection(db, 'calls', incomingCallData.callId, 'candidates'), {
          candidate: event.candidate.toJSON(),
          senderId: auth.currentUser?.uid,
          timestamp: serverTimestamp(),
        });
      }
    };

    const offerDescription = incomingCallData.offer;
    await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);

    const callDoc = doc(db, 'calls', incomingCallData.callId);
    await updateDoc(callDoc, {
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      },
      status: 'answering',
    });

    onSnapshot(collection(db, 'calls', incomingCallData.callId, 'candidates'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.senderId !== auth.currentUser?.uid) {
            pc.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      });
    });

    setStatus('active');
  };

  const rejectCall = async () => {
    if (callIdRef.current) {
      await updateDoc(doc(db, 'calls', callIdRef.current), { status: 'rejected' });
    }
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4 md:p-8"
      >
        <div className="w-full max-w-5xl aspect-video bg-black rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/10 flex flex-col">
          
          {/* Remote Video (Full Screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local Video (Picture in Picture) */}
          <motion.div 
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <User className="text-white/20 w-12 h-12" />
              </div>
            )}
          </motion.div>

          {/* Overlay Info */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {status === 'ringing' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-pulse">
                   <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl">
                      <Phone className="text-white w-10 h-10 animate-bounce" />
                   </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{otherUser.displayName}</h2>
                <p className="text-emerald-400 font-bold tracking-widest uppercase text-sm">
                  {isIncoming ? 'Incoming Call...' : 'Calling...'}
                </p>
              </motion.div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-6 px-8 py-4 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 z-30 pointer-events-auto">
            {isIncoming && status === 'ringing' ? (
              <>
                <button
                  onClick={answerCall}
                  className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-90"
                >
                  <Phone size={28} />
                </button>
                <button
                  onClick={rejectCall}
                  className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-90"
                >
                  <PhoneOff size={28} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90",
                    isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90",
                    isVideoOff ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
                <button
                  onClick={onClose}
                  className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-90"
                >
                  <PhoneOff size={28} />
                </button>
              </>
            )}
          </div>

          {/* Encryption Badge */}
          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
            <Shield size={14} className="text-emerald-500" />
            <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">End-to-End Encrypted</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default CallModal;
