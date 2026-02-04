import React, { useState, useRef, useEffect } from 'react';
import { User, Story, MusicMetadata, Post } from '../../types';
import { addStory, addPost } from '../../firebase';
import { MusicPicker } from './MusicPicker';

interface StoryUploadProps {
  currentUser: User;
  onClose: () => void;
}

type CameraMode = 'Post' | 'Story' | 'Live';

const FILTERS = [
    { name: 'Natural', class: '', preview: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdGgTzR-8UHG-XzH6otA8-_aOjofQjtrBJj7rN_L9Orzh9zULe0X4lhL3yCJbiDywACAgV232JcxA7ufrlWqsUQdjbjxaHnf4EPyNTQM8QA7GZb-t1Qx6pPSiFS8QnO3zaV-uqO5lazk2X4_PuZZwy3E_BFi7QaBSF-59byPLPoLHCQusHq4Bi2f_vEIDkUY5DIBj3oeKE4z9bFmfjiqevJjN25JfubaMDCizLUq-Bkbq45g9Bg81sn8d0QFjdh5hQm-GFeV2C' },
    { name: 'Noir', class: 'grayscale brightness-75 contrast-125', preview: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-dXs6PiCbvSWT1qdFwKwjin5KzRIMDJH19ExRPBfPSXm7dDOW1VBDVzLDqNPhEhaYP6V6gFyDBFAq1ZzomGOHDk8XssmNmPfvJTG9n-6AoRH-ZsMeBsPvYpHHxboZDZIBTOZyAyyzm1ozEFwjG4AQhCuwcUzuBlvM6VJkU8YqVVtTe3B1QvSyuiIY74lQqZsy81AYSHmjehY4xDymd6Ppsd5Xs0NXkp9rQTp76jZKflmLeqinTLYeVMfHmf5_0L2NA6hiZWmm' },
    { name: 'Vivid', class: 'saturate-200 contrast-110', preview: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnB8dghW0YzMryRjyNuomQ8DvGZ70j50Q0WjSR-wDhWw5YKOXCfuaqLd7WM0oi5DVqr9AG1l8bdz6ooXen550Pso0ExObnj7cAKEp5hKFx0eDnf6P6F3lpc6ViUjN9pwL0QBCZizLdTLqtBy5Rcsd3plil80AXNNeVL4SBOxxEtgbFgpMNhKm7f1e0snV97iBd9Z32AfvAZt6O4rYJRpea2KjAz6JX4RxS4Q0BAZsXmSi4IlgxdoJNVIBSGBudFv5gephKFVVK' },
    { name: 'Golden', class: 'sepia-[0.3] hue-rotate-[-10deg] saturate-150', preview: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAgCl7ZqsRr3erLmZctjRsJLARWOw0tuy_D5fUNZCy6-9MVZXYKay6aJe-WgYqhQpnjSdXlBkl4UGcjKx6l7j31xxWX3OJu3LjCLIb4Eu-FF9OykB1-8LmUtXLNxMkmCZZQvjyC_lSaT7IyBKrJZhx7HxM04Dmh_BbOdUw20FNIbK7072ecbMOODh_c4QwDderRo_iQYRaG94nhzVXQ3I8udknSlqQcf2cluy0m01jTJZTo6BXd6XufT5FZifYx7LCzGBEodmQo' },
    { name: 'Frost', class: 'hue-rotate-[180deg] saturate-50 brightness-110', preview: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBg-Ht7YgD4Jhh_mbVZ9BVheuiPJCtZ2AziilMfDUbObOXyRN59WvGJBTZ31GKPiow5-Bdn-iwY4IoCKkTvSLEZ54nHJ3usJ_Is3-d7QOiSNS73getkr9AqNno9G98ADRF2oUFynt97Pk9v7dw4sxZVZL5-5KLnXyeV9zmfNGgPneyu3c1iRwvsn9xGjamHf09_bpY-b2BNjQ1y9rpPhSAhmhasbIOAry0eOtmjKNZU_7K1OfvASH6TtztZXU6cy9DeQdbQeJpF' }
];

export const StoryUpload: React.FC<StoryUploadProps> = ({ currentUser, onClose }) => {
  const [mode, setMode] = useState<CameraMode>('Story');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicMetadata | null>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const generateUID = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    if (preview) return; 
    setIsStartingCamera(true);
    stopCamera();

    try {
      // Standard constraints that work on 99% of modern mobiles
      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Critical: Handle the play promise for mobile browsers
        videoRef.current.onloadedmetadata = async () => {
            try {
                if (videoRef.current) {
                    await videoRef.current.play();
                    setIsCameraActive(true);
                }
            } catch (playErr) {
                console.error("Autoplay failed:", playErr);
            }
        };
      }
    } catch (err) {
      console.error("Camera Access Error:", err);
      // Absolute fallback
      try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await videoRef.current.play();
              setIsCameraActive(true);
          }
      } catch (fallbackErr) {
          alert("Could not access camera. Please ensure permissions are granted and you are on HTTPS.");
          setIsCameraActive(false);
      }
    } finally {
      setIsStartingCamera(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [cameraFacing]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;
    
    const video = videoRef.current;
    if (video.readyState < 2) return; 

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fix: Flip the capture if using the front (mirrored) camera
    if (cameraFacing === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Reset transform for future draws
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Optimized quality for Firestore (1MB limit)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setPreview(dataUrl);
    setMediaType('image');
    stopCamera();
  };

  const handleSwitchCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    stopCamera();
    const isVideo = selected.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setFile(selected);
    
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!preview || isUploading) return;
    setIsUploading(true);
    
    try {
      let mediaData = preview;
      
      // If selected from gallery, convert file to Base64
      if (file) {
          mediaData = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (err) => reject(err);
          });
      }

      const uploadId = generateUID();

      if (mode === 'Story') {
        await addStory({
          id: 'story_' + uploadId,
          userId: currentUser.uid,
          userName: currentUser.name,
          userPhoto: currentUser.photoURL,
          mediaUrl: mediaData,
          mediaType: mediaType!,
          caption,
          timestamp: Date.now(),
          music: selectedMusic || undefined
        });
      } else if (mode === 'Post') {
        await addPost({
          userId: currentUser.uid,
          userName: currentUser.name,
          userPhoto: currentUser.photoURL,
          mediaUrl: mediaData,
          mediaType: mediaType!,
          caption,
          location: 'ROXX Universe',
          timestamp: Date.now()
        });
      }
      onClose();
    } catch (e) {
      console.error("Upload error:", e);
      alert("Capture/Upload failed. The image might be too large for the database.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black text-white font-display overflow-hidden animate-in fade-in flex flex-col h-[100dvh]">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Viewfinder / Preview Background */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
        {preview ? (
            <div className={`w-full h-full relative transition-all duration-500 ${selectedFilter.class}`}>
                {mediaType === 'video' ? (
                    <video src={preview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                    <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                )}
            </div>
        ) : (
            <div className={`w-full h-full relative ${selectedFilter.class}`}>
                {isCameraActive ? (
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-900/50">
                        {isStartingCamera ? (
                             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <span className="material-symbols-outlined text-6xl opacity-20">videocam_off</span>
                        )}
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                            {isStartingCamera ? 'Waking up camera...' : 'Initializing Lens'}
                        </p>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Top Controls Overlay */}
      <div className="relative z-10 flex items-center justify-between p-6 pt-12 bg-gradient-to-b from-black/60 to-transparent">
        <button 
            onClick={onClose} 
            className="flex items-center justify-center size-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white transition-all active:scale-90"
        >
            <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex gap-2">
            {!preview && isCameraActive && (
                <button 
                    onClick={handleSwitchCamera}
                    className="flex items-center justify-center size-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white active:bg-white/20 active:rotate-180 transition-all duration-500"
                >
                    <span className="material-symbols-outlined">sync</span>
                </button>
            )}
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="mt-auto relative z-20 w-full flex flex-col items-center">
        
        {/* Caption Panel (Visible only when media is captured/selected) */}
        {preview && (
            <div className="w-full px-6 mb-8 animate-in slide-in-from-bottom-10">
                <div className="bg-black/60 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/10 flex flex-col gap-5 shadow-2xl">
                    <textarea 
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a creative caption..."
                        className="bg-transparent border-none focus:ring-0 text-white placeholder-white/30 text-sm font-bold resize-none h-20 w-full text-center"
                    />
                    <div className="flex gap-3">
                        <button 
                            onClick={() => { setPreview(null); setFile(null); startCamera(); }}
                            disabled={isUploading}
                            className="flex-1 py-4 bg-white/10 text-white rounded-3xl font-bold uppercase tracking-widest text-[10px]"
                        >
                            Retake
                        </button>
                        <button 
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="flex-[2] py-4 bg-primary text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isUploading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                `Post ${mode}`
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Filter Carousel */}
        {!preview && (
            <div className="flex w-full overflow-x-auto no-scrollbar px-4 py-6 scroll-smooth bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex flex-row items-end justify-center gap-6 mx-auto">
                    {FILTERS.map((f) => (
                        <button 
                            key={f.name}
                            onClick={() => setSelectedFilter(f)}
                            className="flex flex-col items-center gap-3 min-w-[70px] transition-all"
                        >
                            <div className={`size-14 rounded-full border-2 transition-all overflow-hidden ${selectedFilter.name === f.name ? 'size-20 border-primary ring-4 ring-black/50 scale-110 shadow-lg' : 'border-white/20'}`}>
                                <img src={f.preview} className="w-full h-full object-cover" alt={f.name} />
                            </div>
                            <p className={`text-[10px] font-black tracking-widest uppercase ${selectedFilter.name === f.name ? 'text-primary' : 'text-white/60'}`}>{f.name}</p>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Main Capture Control */}
        {!preview && (
            <div className="flex items-center justify-center gap-10 p-4 pb-8 w-full max-w-sm">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-xl border border-white/10 text-white transition-transform active:scale-90"
                >
                    <span className="material-symbols-outlined">photo_library</span>
                </button>

                <button 
                    onClick={handleCapture}
                    disabled={!isCameraActive}
                    className="relative flex items-center justify-center group disabled:opacity-30 active:scale-110 transition-transform"
                >
                    <div className="absolute size-24 bg-primary/20 rounded-full animate-pulse group-active:scale-125 transition-transform"></div>
                    <div className="relative flex shrink-0 items-center justify-center rounded-full size-20 border-[6px] border-white/40 bg-white/5 p-1 shadow-[0_0_30px_rgba(51,13,242,0.3)]">
                        <div className="size-full bg-white rounded-full transition-transform group-active:scale-90"></div>
                    </div>
                </button>

                <button 
                    onClick={() => setShowMusicPicker(true)}
                    className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-xl border border-white/10 text-white transition-transform active:scale-90"
                >
                    <span className={`material-symbols-outlined ${selectedMusic ? 'text-primary' : ''}`}>music_note</span>
                </button>
            </div>
        )}

        {/* Mode Selector */}
        {!preview && (
            <div className="flex px-8 pb-10 w-full max-w-sm">
                <div className="flex h-12 flex-1 items-center justify-center rounded-full bg-black/40 backdrop-blur-xl p-1.5 border border-white/10">
                    {(['Post', 'Story', 'Live'] as CameraMode[]).map((m) => (
                        <label key={m} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-full px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === m ? 'bg-white text-black shadow-lg shadow-white/20' : 'text-white/40 hover:text-white'}`}>
                            <span>{m}</span>
                            <input 
                                type="radio" 
                                className="invisible w-0" 
                                name="camera-mode" 
                                checked={mode === m} 
                                onChange={() => setMode(m)} 
                            />
                        </label>
                    ))}
                </div>
            </div>
        )}
      </div>

      {showMusicPicker && (
          <MusicPicker 
            onClose={() => setShowMusicPicker(false)}
            onSelect={setSelectedMusic}
          />
      )}
    </div>
  );
};
