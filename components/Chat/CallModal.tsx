
import React, { useState, useEffect, useRef } from 'react';
import { CallSession, CallStatus } from '../../types';
import { updateCallStatus, getCallById, updateCallSignal, addIceCandidate, subscribeToCall } from '../../firebase';

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
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  // 1. Initialize Peer Connection & Local Stream
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: session.type === 'video' 
        });
        localStream.current = stream;
        
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        pc.current = new RTCPeerConnection(SERVERS);

        // Add tracks
        stream.getTracks().forEach(track => {
            if (pc.current) pc.current.addTrack(track, stream);
        });

        // Handle remote stream
        pc.current.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        // Handle ICE candidates
        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                addIceCandidate(session.id, event.candidate, session.isIncoming ? 'callee' : 'caller');
            }
        };

        // If caller, create offer
        if (!session.isIncoming) {
            const offer = await pc.current.createOffer();
            await pc.current.setLocalDescription(offer);
            await updateCallSignal(session.id, { offer });
        }

      } catch (err) {
        console.error("Media/WebRTC Error:", err);
        setStatus('denied');
      }
    };

    init();

    return () => {
       // Cleanup
       if(localStream.current) localStream.current.getTracks().forEach(t => t.stop());
       if(pc.current) pc.current.close();
    };
  }, []);

  // 2. Listen for Signaling Changes
  useEffect(() => {
    const unsubscribe = subscribeToCall(session.id, async (data) => {
        if (!data) return;
        
        // Handle Status Updates
        if (data.status === 'ended' || data.status === 'rejected') {
            onHangUp();
        } else if (data.status === 'accepted') {
            setStatus('accepted');
        }

        if (!pc.current) return;

        // Handle Signaling
        if (!session.isIncoming && data.answer && !pc.current.currentRemoteDescription) {
            // Caller receives Answer
            const answer = new RTCSessionDescription(data.answer);
            await pc.current.setRemoteDescription(answer);
        } else if (session.isIncoming && data.offer && !pc.current.remoteDescription) {
            // Callee receives Offer (usually implicitly handled in init but strictly checks here)
            // Logic moved to "Accept" button action to avoid auto-answering signaling before UI accept
        }

        // Handle Candidates
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
    if (!pc.current) return;
    
    // Fetch latest offer to be sure
    const callData = await getCallById(session.id);
    if (callData?.offer) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(callData.offer));
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        
        await updateCallSignal(session.id, { answer });
        await updateCallStatus(session.id, 'accepted');
        setStatus('accepted');
    }
  };

  const handleDecline = async () => {
    await updateCallStatus(session.id, 'rejected');
    onHangUp();
  };

  const toggleMute = () => {
    if (localStream.current) {
        const track = localStream.current.getAudioTracks()[0];
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
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

  // Timer
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

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center text-white overflow-hidden animate-in fade-in duration-500">
      {/* Remote Video (Full Screen) */}
      <video 
        ref={remoteVideoRef} 
        autoPlay 
        playsInline 
        className={`absolute inset-0 w-full h-full object-cover z-0 ${session.type === 'voice' ? 'hidden' : ''}`}
      />
      
      {/* Background Partner Blur (if voice or waiting) */}
      <div className={`absolute inset-0 opacity-40 blur-[50px] pointer-events-none bg-slate-900 z-0 ${status === 'accepted' && session.type === 'video' ? 'opacity-0' : 'opacity-100'}`}>
        <img src={session.partner.photoURL} className="w-full h-full object-cover" alt="" />
      </div>

      {/* Main UI Overlay */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-6 h-full py-12 justify-between">
        
        {/* Header / Info */}
        <div className="text-center mt-10">
            {status !== 'accepted' && (
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl mx-auto mb-6">
                    <img src={session.partner.photoURL} className="w-full h-full object-cover" alt="" />
                </div>
            )}
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md">{session.partner.name}</h2>
            <p className="text-white/80 font-bold tracking-[0.2em] uppercase text-xs mt-2 bg-black/20 inline-block px-4 py-1 rounded-full backdrop-blur-md">
                {status === 'accepted' ? formatDuration(duration) : status === 'calling' ? 'Calling...' : 'Incoming...'}
            </p>
        </div>

        {/* Local Video Preview */}
        {session.type === 'video' && (
             <div className="w-32 h-48 bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/20 absolute top-4 right-4 z-20">
                <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover mirror ${isVideoOff ? 'hidden' : ''}`} />
                {isVideoOff && <div className="w-full h-full flex items-center justify-center text-xs text-white/50 uppercase font-bold">Cam Off</div>}
             </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-6 mb-8">
            {status === 'ringing' && session.isIncoming ? (
                <>
                    <button onClick={handleDecline} className="p-6 bg-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"><svg className="w-8 h-8 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg></button>
                    <button onClick={handleAccept} className="p-6 bg-green-500 rounded-full shadow-lg hover:scale-110 transition-transform animate-bounce"><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg></button>
                </>
            ) : (
                <>
                    <button onClick={toggleMute} className={`p-4 rounded-full ${isMuted ? 'bg-white text-slate-900' : 'bg-white/20 hover:bg-white/30 backdrop-blur-md'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMuted ? "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM5.5 5.5l13 13" : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"} /></svg></button>
                    <button onClick={handleDecline} className="p-6 bg-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"><svg className="w-8 h-8 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg></button>
                    {session.type === 'video' && (
                        <button onClick={toggleVideo} className={`p-4 rounded-full ${isVideoOff ? 'bg-white text-slate-900' : 'bg-white/20 hover:bg-white/30 backdrop-blur-md'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
