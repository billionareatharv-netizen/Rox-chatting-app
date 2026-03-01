
import React, { useState, useEffect, useRef } from 'react';
import { CallSession, CallStatus } from '../../types';
import { updateCallStatus, getCallById, updateCallSignal, addIceCandidate, subscribeToCall } from '../../firebase';
import { hasPremiumAccess, ADMIN_STYLE } from '../../premiumUtils';

interface CallModalProps {
  session: CallSession;
  onHangUp: () => void;
}

const SERVERS = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ]
};

export const CallModal: React.FC<CallModalProps> = ({ session, onHangUp }) => {
  const [status, setStatus] = useState<CallStatus | 'calling' | 'denied'>(session.isIncoming ? 'ringing' : 'calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(session.type === 'voice');
  const [duration, setDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null); // Critical: Separate audio element
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  // 1. Initialize & Cleanup
  useEffect(() => {
    const init = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: session.type === 'video' ? { facingMode: 'user' } : false 
            });
            localStream.current = stream;
            
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.muted = true;
            }

            const peer = new RTCPeerConnection(SERVERS);
            pc.current = peer;

            stream.getTracks().forEach(track => peer.addTrack(track, stream));

            peer.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    if (session.type === 'video' && remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    }
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                }
            };

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    addIceCandidate(session.id, event.candidate, session.isIncoming ? 'callee' : 'caller');
                }
            };

            peer.onconnectionstatechange = () => {
                if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
                    handleEnd();
                }
            };

            // If we are the caller, create the offer immediately
            if (!session.isIncoming) {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                await updateCallSignal(session.id, { offer });
            } else if (status === 'accepted') {
                // If we are the callee and just accepted, we need to handle the offer
                const callData = await getCallById(session.id);
                if (callData?.offer) {
                    await peer.setRemoteDescription(new RTCSessionDescription(callData.offer));
                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    await updateCallSignal(session.id, { answer });
                }
            }
        } catch (e) {
            console.error("Media Error:", e);
            setStatus('denied');
        }
    };

    if (!session.isIncoming || status === 'accepted') {
        init();
    }

    return () => {
        localStream.current?.getTracks().forEach(t => t.stop());
        pc.current?.close();
    };
  }, [session.isIncoming, status]);

  // 2. Signaling Listener
  useEffect(() => {
    const unsub = subscribeToCall(session.id, async (data) => {
        if (!data) return;
        if (data.status === 'ended' || data.status === 'rejected') onHangUp();
        
        if (data.status === 'accepted' && status !== 'accepted') {
            setStatus('accepted');
            // Start duration timer
            const timer = setInterval(() => setDuration(d => d + 1), 1000);
            return () => clearInterval(timer);
        }

        if (!pc.current) return;

        // Caller handles answer
        if (!session.isIncoming && data.answer && pc.current.signalingState === 'have-local-offer') {
            await pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }

        // Handle ICE candidates
        const remoteCandidates = session.isIncoming ? data.callerCandidates : data.calleeCandidates;
        if (remoteCandidates) {
            for (const candidate of remoteCandidates) {
                try {
                    await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    // Ignore stale candidates
                }
            }
        }
    });
    return () => unsub();
  }, [session.id, status]);

  const handleAccept = async () => {
      await updateCallStatus(session.id, 'accepted');
      setStatus('accepted');
  };

  const handleEnd = async () => {
      await updateCallStatus(session.id, 'ended');
      onHangUp();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-between py-10 text-white animate-in fade-in">
        {/* Audio Element is Critical */}
        <audio ref={remoteAudioRef} autoPlay />

        {/* Video Areas */}
        {session.type === 'video' && (
            <>
                <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover z-0" />
                <div className="absolute top-4 right-4 w-32 h-48 bg-black rounded-xl overflow-hidden shadow-2xl z-20 border border-white/20">
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
                </div>
            </>
        )}

        <div className="z-30 text-center mt-10">
            <img src={session.partner.photoURL} className="w-24 h-24 rounded-full border-4 border-white/20 shadow-xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold">{session.partner.name}</h2>
            <p className="text-sm font-medium opacity-80 uppercase tracking-widest">
                {status === 'ringing' ? 'Incoming Call...' : status === 'calling' ? 'Calling...' : formatTime(duration)}
            </p>
        </div>

        <div className="z-30 flex items-center gap-8 mb-8">
            {status === 'ringing' && session.isIncoming ? (
                <>
                    <button onClick={handleEnd} className="p-6 bg-red-500 rounded-full shadow-lg hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                    </button>
                    <button onClick={handleAccept} className="p-6 bg-green-500 rounded-full shadow-lg hover:scale-110 transition-transform animate-pulse">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                    </button>
                </>
            ) : (
                <button onClick={handleEnd} className="p-6 bg-red-500 rounded-full shadow-lg hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                </button>
            )}
        </div>
    </div>
  );
};

const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
};
