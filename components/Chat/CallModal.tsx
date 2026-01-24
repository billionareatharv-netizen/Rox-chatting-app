
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  // Premium Checks
  // Check if Caller (partner) is Admin or Premium to show THEIR custom styling to ME
  const isPartnerPremium = hasPremiumAccess(session.partner, 'call_effects');
  const isPartnerAdmin = session.partner.isAdmin;

  // Initialize Ringtone
  useEffect(() => {
    if (session.isIncoming && status === 'ringing') {
      try {
        // Use custom ringtone if partner is Premium/Admin
        const ringtoneUrl = (isPartnerPremium || isPartnerAdmin) 
            ? "https://cdn.pixabay.com/download/audio/2021/08/09/audio_88447e769f.mp3?filename=orchestral-logo-opener-11532.mp3" // Premium Tone
            : "https://cdn.pixabay.com/download/audio/2022/03/24/audio_c8c8a73467.mp3?filename=smartphone-ringtone-6260.mp3"; // Standard Tone

        const audio = new Audio(ringtoneUrl);
        audio.loop = true;
        audio.play().catch(e => console.warn("Autoplay blocked for ringtone", e));
        ringtoneRef.current = audio;
      } catch (e) {}
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    }
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
      }
    };
  }, [session.isIncoming, status, isPartnerPremium, isPartnerAdmin]);

  const handleMediaError = (err: any) => {
    console.error("Media/WebRTC Error:", err);
    setStatus('denied');
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg("Permission denied. Please allow camera/microphone access.");
    } else if (err.name === 'NotFoundError') {
        setErrorMsg("No camera or microphone found.");
    } else if (err.name === 'NotReadableError') {
        setErrorMsg("Hardware is being used by another app.");
    } else if (!navigator.mediaDevices && window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
        setErrorMsg("Calls require HTTPS secure connection.");
    } else {
        setErrorMsg("Failed to access media devices.");
    }
  };

  // 1. Initialize Peer Connection & Local Stream (For Caller)
  useEffect(() => {
    const init = async () => {
      try {
        // Check for secure context support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("MediaDevices API not supported (requires HTTPS)");
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: session.type === 'video' ? { facingMode: 'user' } : false 
        });
        localStream.current = stream;
        
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
        }

        pc.current = new RTCPeerConnection(SERVERS);

        stream.getTracks().forEach(track => {
            if (pc.current && localStream.current) pc.current.addTrack(track, localStream.current);
        });

        pc.current.ontrack = (event) => {
            const track = event.track;
            const remoteStream = new MediaStream([track]);

            if (track.kind === 'video') {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
            } else if (track.kind === 'audio') {
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = remoteStream;
                    remoteAudioRef.current.play().catch(e => console.error("Remote audio play error", e));
                }
            }
        };

        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                addIceCandidate(session.id, event.candidate, session.isIncoming ? 'callee' : 'caller');
            }
        };

        if (!session.isIncoming) {
            const offer = await pc.current.createOffer();
            await pc.current.setLocalDescription(offer);
            await updateCallSignal(session.id, { offer });
        }

      } catch (err) {
        handleMediaError(err);
      }
    };

    if (!session.isIncoming) {
        init();
    }

    return () => {
       if(localStream.current) localStream.current.getTracks().forEach(t => t.stop());
       if(pc.current) pc.current.close();
    };
  }, []);

  // 2. Listen for Signaling Changes
  useEffect(() => {
    const unsubscribe = subscribeToCall(session.id, async (data) => {
        if (!data) return;
        
        if (data.status === 'ended' || data.status === 'rejected') {
            onHangUp();
        } else if (data.status === 'accepted') {
            setStatus('accepted');
        }

        if (!pc.current) return;

        if (!session.isIncoming && data.answer && !pc.current.currentRemoteDescription) {
            try {
                const answer = new RTCSessionDescription(data.answer);
                await pc.current.setRemoteDescription(answer);
            } catch (e) { console.error("Set Remote Desc Error", e); }
        }

        const newCandidates = session.isIncoming ? data.callerCandidates : data.calleeCandidates;
        if (newCandidates && newCandidates.length > 0) {
           newCandidates.forEach(async (c: any) => {
               try { await pc.current?.addIceCandidate(new RTCIceCandidate(c)); } catch(e) {}
           });
        }
    });
    return () => unsubscribe();
  }, [session.id, session.isIncoming]);

  const handleAccept = async () => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("MediaDevices API not supported");
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: session.type === 'video' 
        });
        localStream.current = stream;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
        }

        pc.current = new RTCPeerConnection(SERVERS);
        
        stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

        pc.current.ontrack = (event) => {
            const track = event.track;
            const remoteStream = new MediaStream([track]);
            if (track.kind === 'video' && remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            } else if (track.kind === 'audio' && remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = remoteStream;
                remoteAudioRef.current.play().catch(console.error);
            }
        };

        pc.current.onicecandidate = (event) => {
            if (event.candidate) addIceCandidate(session.id, event.candidate, 'callee');
        };

        const callData = await getCallById(session.id);
        if (callData?.offer) {
            await pc.current.setRemoteDescription(new RTCSessionDescription(callData.offer));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
            
            await updateCallSignal(session.id, { answer });
            await updateCallStatus(session.id, 'accepted');
            setStatus('accepted');
        }
    } catch(err) {
        handleMediaError(err);
    }
  };

  const handleDecline = async () => {
    await updateCallStatus(session.id, 'rejected');
    onHangUp();
  };

  const toggleMute = () => {
    if (localStream.current) {
        const track = localStream.current.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsMuted(!track.enabled);
        }
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
        const track = localStream.current.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsVideoOff(!track.enabled);
        }
    }
  };

  useEffect(() => {
    let t: any;
    if (status === 'accepted') t = setInterval(() => setDuration(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine Background Style based on Premium Status
  const getBackgroundClass = () => {
      if (isPartnerAdmin) return "bg-gradient-to-br from-slate-900 via-yellow-900/40 to-black";
      if (isPartnerPremium) return "bg-gradient-to-br from-indigo-900 via-purple-900 to-black";
      return "bg-slate-950";
  };

  return (
    <div className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center text-white overflow-hidden animate-in fade-in duration-500 ${getBackgroundClass()}`}>
      
      {/* Remote Video (Full Screen) */}
      <video 
        ref={remoteVideoRef} 
        autoPlay 
        playsInline 
        className={`absolute inset-0 w-full h-full object-cover z-0 ${session.type === 'voice' ? 'hidden' : ''}`}
      />
      
      {/* Dedicated Audio Element for Voice */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Background Partner Blur with Premium Pulse */}
      <div className={`absolute inset-0 opacity-40 blur-[50px] pointer-events-none bg-slate-900 z-0 ${status === 'accepted' && session.type === 'video' ? 'opacity-0' : 'opacity-100'}`}>
        <img src={session.partner.photoURL} className="w-full h-full object-cover" alt="" />
      </div>

      {/* Error UI Overlay */}
      {status === 'denied' && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Call Failed</h3>
              <p className="text-slate-400 mb-8 max-w-xs leading-relaxed">{errorMsg || "Unable to access media devices."}</p>
              <button 
                onClick={onHangUp} 
                className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-200 transition-all shadow-lg active:scale-95"
              >
                Close
              </button>
          </div>
      )}

      {/* Main UI Overlay */}
      {status !== 'denied' && (
        <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-6 h-full py-12 justify-between">
            {/* Header / Info */}
            <div className="text-center mt-10">
                {status !== 'accepted' && (
                    <div className="relative w-32 h-32 mx-auto mb-6">
                        <div className={`w-full h-full rounded-full overflow-hidden border-4 shadow-2xl ${isPartnerAdmin ? ADMIN_STYLE.border : (isPartnerPremium ? 'border-purple-500' : 'border-white/10')}`}>
                            <img src={session.partner.photoURL} className="w-full h-full object-cover" alt="" />
                        </div>
                        {(isPartnerAdmin || isPartnerPremium) && (
                            <div className="absolute -bottom-2 -right-2 bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/20">
                                <span className="text-2xl">{isPartnerAdmin ? '👑' : '💎'}</span>
                            </div>
                        )}
                        {/* Premium Glow Ring */}
                        {(isPartnerAdmin || isPartnerPremium) && (
                            <div className={`absolute -inset-4 rounded-full -z-10 animate-pulse-slow ${isPartnerAdmin ? 'bg-yellow-500/20' : 'bg-purple-500/20'}`}></div>
                        )}
                    </div>
                )}
                
                <h2 className={`text-3xl font-black tracking-tight drop-shadow-md ${isPartnerAdmin ? ADMIN_STYLE.text : ''}`}>
                    {session.partner.name}
                </h2>
                
                <p className="text-white/80 font-bold tracking-[0.2em] uppercase text-xs mt-2 bg-black/20 inline-block px-4 py-1 rounded-full backdrop-blur-md">
                    {status === 'accepted' ? formatDuration(duration) : status === 'calling' ? 'Calling...' : 'Incoming Call...'}
                </p>
            </div>

            {/* Local Video Preview */}
            {status === 'accepted' && session.type === 'video' && (
                <div className="w-32 h-48 bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/20 absolute top-6 right-6 z-20">
                    <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover mirror ${isVideoOff ? 'hidden' : ''}`} />
                    {isVideoOff && <div className="w-full h-full flex items-center justify-center text-xs text-white/50 uppercase font-bold">Cam Off</div>}
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-6 mb-8">
                {/* INCOMING CALL UI */}
                {status === 'ringing' && session.isIncoming ? (
                    <>
                        <button onClick={handleDecline} className="flex flex-col items-center gap-2 group">
                            <div className="p-6 bg-red-600 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">Decline</span>
                        </button>
                        <button onClick={handleAccept} className="flex flex-col items-center gap-2 group">
                            <div className="p-6 bg-green-500 rounded-full shadow-lg group-hover:scale-110 transition-transform animate-pulse">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">Accept</span>
                        </button>
                    </>
                ) : (
                    /* ONGOING / OUTGOING UI */
                    <>
                        <button onClick={toggleMute} className={`p-4 rounded-full transition-all ${isMuted ? 'bg-white text-slate-900' : 'bg-white/20 hover:bg-white/30 backdrop-blur-md'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMuted ? "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM5.5 5.5l13 13" : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"} /></svg>
                        </button>
                        <button onClick={handleDecline} className="p-6 bg-red-600 rounded-full shadow-lg hover:scale-110 transition-transform">
                            <svg className="w-8 h-8 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                        </button>
                        {session.type === 'video' && (
                            <button onClick={toggleVideo} className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-white text-slate-900' : 'bg-white/20 hover:bg-white/30 backdrop-blur-md'}`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
