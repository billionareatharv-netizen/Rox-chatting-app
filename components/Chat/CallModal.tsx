
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
            
            // Fix: Immediately attach local stream to preview
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.muted = true; // Mute self to prevent echo
            }

            pc.current = new RTCPeerConnection(SERVERS);

            stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

            pc.current.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    if (session.type === 'video' && remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    }
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                        remoteAudioRef.current.play().catch(e => console.warn("Audio autoplay blocked", e));
                    }
                }
            };

            pc.current.onicecandidate = (event) => {
                if (event.candidate) addIceCandidate(session.id, event.candidate, session.isIncoming ? 'callee' : 'caller');
            };

            if (!session.isIncoming) {
                const offer = await pc.current.createOffer();
                await pc.current.setLocalDescription(offer);
                await updateCallSignal(session.id, { offer });
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
  }, [session.isIncoming, status, session.type]);

  // 2. Signaling
  useEffect(() => {
    const unsub = subscribeToCall(session.id, async (data) => {
        if (!data) return;
        if (data.status === 'ended' || data.status === 'rejected') onHangUp();
        if (data.status === 'accepted' && status !== 'accepted') setStatus('accepted');

        if (!pc.current) return;

        if (!session.isIncoming && data.answer && !pc.current.currentRemoteDescription) {
            await pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }

        const candidates = session.isIncoming ? data.callerCandidates : data.calleeCandidates;
        candidates?.forEach(async (c: any) => {
            try { await pc.current?.addIceCandidate(new RTCIceCandidate(c)); } catch(e){}
        });
    });
    return () => unsub();
  }, [session.id]);

  const handleAccept = async () => {
      setStatus('accepted'); // Triggers init in useEffect
      await updateCallStatus(session.id, 'accepted');
      
      // We need to wait for init to create PC, checking in loop or relying on effect
      // For simplicity in this structure, we assume effect triggers. 
      // But we need to create Answer once offer is set. 
      // Simplification: Caller creates offer. Callee (here) waits for PC to be made by effect, then creates answer.
      // Better flow: Manual logic here.
      
      setTimeout(async () => {
          if(!pc.current) return; // Wait for effect
          const callData = await getCallById(session.id);
          if(callData?.offer) {
              await pc.current.setRemoteDescription(new RTCSessionDescription(callData.offer));
              const answer = await pc.current.createAnswer();
              await pc.current.setLocalDescription(answer);
              await updateCallSignal(session.id, { answer });
          }
      }, 1000);
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
