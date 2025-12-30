
import React, { useState, useEffect, useRef } from 'react';
import { User, CallType, CallSession, CallStatus } from '../../types';
import { updateCallStatus, getCallById } from '../../firebase';

interface CallModalProps {
  session: CallSession;
  onHangUp: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({ session, onHangUp }) => {
  const [status, setStatus] = useState<CallStatus | 'calling' | 'denied'>(session.isIncoming ? 'ringing' : 'calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(session.type === 'voice');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMounted = useRef(true);

  // Status Sync Polling
  useEffect(() => {
    if (status === 'ended' || status === 'rejected') {
        onHangUp();
        return;
    }

    const poll = async () => {
        const remoteCall = await getCallById(session.id);
        if (!remoteCall) {
            setStatus('ended');
            return;
        }
        if (remoteCall.status !== status) {
            setStatus(remoteCall.status);
            if (remoteCall.status === 'accepted' && !streamRef.current) {
                startMedia();
            }
        }
    };

    const itv = setInterval(poll, 2000);
    return () => clearInterval(itv);
  }, [status, session.id]);

  const startMedia = async () => {
    if (!isMounted.current) return;
    
    setError(null);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (isMounted.current) {
        setError("Your browser does not support calling features.");
        setStatus('denied');
      }
      return;
    }

    try {
      const constraints = {
        audio: true,
        video: session.type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!isMounted.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Media Error:", err);
      if (isMounted.current) {
        setError(`Call error: ${err.message || 'Check permissions'}`);
        setStatus('denied');
      }
    }
  };

  const handleAccept = async () => {
    await updateCallStatus(session.id, 'accepted');
    setStatus('accepted');
    startMedia();
  };

  const handleDecline = async () => {
    await updateCallStatus(session.id, 'rejected');
    onHangUp();
  };

  useEffect(() => {
    isMounted.current = true;
    if (!session.isIncoming) {
        startMedia();
    }
    return () => {
      isMounted.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [session.type, session.isIncoming]);

  useEffect(() => {
    let interval: any;
    if (status === 'accepted') {
      interval = setInterval(() => {
        if (isMounted.current) setDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (session.type === 'voice') return;
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  if (status === 'denied') {
    return (
      <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center animate-in fade-in duration-300">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold mb-4">Connection Failed</h2>
        <p className="text-slate-400 mb-10 max-w-sm leading-relaxed">{error}</p>
        <button onClick={onHangUp} className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95">Go Back</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center text-white overflow-hidden animate-in fade-in duration-500">
      {/* Background Partner Blur */}
      <div className="absolute inset-0 opacity-20 blur-[100px] pointer-events-none">
        <img src={session.partner.photoURL} className="w-full h-full object-cover scale-150" alt="" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-6 h-full py-12">
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="relative">
            <div className={`w-36 h-36 md:w-56 md:h-56 rounded-[3.5rem] overflow-hidden border-4 border-white/10 shadow-2xl transition-all duration-1000 ${status === 'calling' || status === 'ringing' ? 'scale-105 animate-pulse' : 'scale-100'}`}>
              <img src={session.partner.photoURL} className="w-full h-full object-cover" alt="" />
            </div>
            {(status === 'calling' || status === 'ringing') && (
              <div className="absolute inset-0 rounded-[3.5rem] border-4 border-indigo-500 animate-ping opacity-30"></div>
            )}
            <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>
              {status === 'accepted' ? 'Live Session' : session.isIncoming ? 'Incoming Call' : 'Outgoing Call'}
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-4xl font-black mb-3 tracking-tight">{session.partner.name}</h2>
            <p className="text-indigo-400/80 font-bold tracking-[0.3em] uppercase text-[10px]">
              {status === 'calling' ? 'Calling...' : status === 'ringing' ? 'Ringing...' : status === 'accepted' ? `In Call • ${formatDuration(duration)}` : 'Connecting...'}
            </p>
          </div>
        </div>

        {/* Local Video Preview */}
        {session.type === 'video' && status === 'accepted' && (
          <div className="absolute top-10 right-10 w-36 h-52 bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 z-50 transition-all hover:scale-105 group ring-1 ring-white/5">
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-700 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-3">
                <div className="p-3 bg-white/5 rounded-full">
                  <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">Cam Off</span>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-8 pb-16 animate-in slide-in-from-bottom-8 duration-1000">
          {status === 'ringing' && session.isIncoming ? (
            <>
              <button 
                onClick={handleDecline}
                className="p-8 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-2xl shadow-red-600/40 transition-all active:scale-95 flex items-center justify-center"
              >
                <svg className="w-10 h-10 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </button>
              <button 
                onClick={handleAccept}
                className="p-8 bg-green-500 hover:bg-green-400 text-white rounded-full shadow-2xl shadow-green-500/40 transition-all active:scale-95 flex items-center justify-center animate-bounce"
              >
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={toggleMute}
                disabled={status !== 'accepted'}
                className={`p-6 rounded-full backdrop-blur-2xl transition-all active:scale-90 border border-white/10 shadow-lg ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 hover:bg-white/10 text-white disabled:opacity-20'}`}
              >
                {isMuted ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM5.5 5.5l13 13" /></svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                )}
              </button>

              <button 
                onClick={handleDecline}
                className="p-8 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-[0_0_50px_rgba(220,38,38,0.4)] transition-all active:scale-95 group flex items-center justify-center"
              >
                <svg className="w-10 h-10 rotate-[135deg] group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </button>

              {session.type === 'video' && (
                <button 
                  onClick={toggleVideo}
                  disabled={status !== 'accepted'}
                  className={`p-6 rounded-full backdrop-blur-2xl transition-all active:scale-90 border border-white/10 shadow-lg ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/5 hover:bg-white/10 text-white disabled:opacity-20'}`}
                >
                  {isVideoOff ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
