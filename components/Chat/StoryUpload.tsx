import React, { useState, useRef, useEffect } from 'react';
import { User, Story, MusicMetadata, Post } from '../../types';
import { addStory, addPost } from '../../firebase';
import { MusicPicker } from './MusicPicker';
import { aiService } from '../../src/services/aiService';
import { motion, AnimatePresence } from 'motion/react';
import { AISelectionModal } from './AISelectionModal';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiOptions, setAiOptions] = useState<string[]>([]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalTitle, setAiModalTitle] = useState('');
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicMetadata | null>(null);

  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const generateUID = () => Math.random().toString(36).substring(2, 15);

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
    setIsCameraReady(false);
  };

  const startCamera = async () => {
    if (preview) return;
    setHasError(null);
    stopCamera();

    try {
      // Try with ideal constraints first
      const constraints = {
        video: { 
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn("Ideal constraints failed, trying simple constraints", firstErr);
        // Fallback to simple constraints
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: cameraFacing },
          audio: false 
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            setIsCameraReady(true);
          } catch (playErr) {
            setHasError("Tap screen to start camera");
          }
        };
      }
    } catch (err: any) {
      console.error("Camera Access Error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setHasError("Camera permission denied");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setHasError("No camera found");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setHasError("Camera is already in use by another app");
      } else {
        setHasError(err.message || "Camera unavailable");
      }
    }
  };

  const handleSwitchCamera = () => {
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [cameraFacing, preview === null]);

  const compressImage = (img: HTMLImageElement | HTMLVideoElement): string => {
      const canvas = document.createElement('canvas');
      const MAX_DIM = 1080;
      let width = (img instanceof HTMLVideoElement) ? img.videoWidth : img.width;
      let height = (img instanceof HTMLVideoElement) ? img.videoHeight : img.height;

      if (width > height) {
          if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
          }
      } else {
          if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
          }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return "";

      if (cameraFacing === 'user' && img instanceof HTMLVideoElement) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.6);
  };

  const handleCapture = () => {
    if (!videoRef.current || !isCameraReady) return;
    const dataUrl = compressImage(videoRef.current);
    setPreview(dataUrl);
    setMediaType('image');
    stopCamera();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setIsProcessing(true);
    if (selected.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const compressed = compressImage(img);
                setPreview(compressed);
                setMediaType('image');
                setFile(null); 
                setIsProcessing(false);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(selected);
    } else if (selected.type.startsWith('video/')) {
        // Video size check - strict for database storage
        if (selected.size > 1024 * 1024 * 0.8) { // 800KB Limit for video to account for Base64 growth
            alert("Video must be very small (<800KB) for real-time storage. Try a shorter clip.");
            setIsProcessing(false);
            return;
        }
        setMediaType('video');
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setIsProcessing(false);
    }
    stopCamera();
    e.target.value = '';
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  };

  const handleUpload = async () => {
    if (!preview || isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);
    
    try {
      let finalMediaData = preview;

      if (file && mediaType === 'video') {
          finalMediaData = await convertFileToBase64(file);
      }

      if (finalMediaData.length > 1000000) {
          clearInterval(progressInterval);
          throw new Error("This file is too large for the database. Try a shorter video or different photo.");
      }

      const uploadId = generateUID();

      // AI Content Filtering
      if (caption.trim()) {
        const filterResult = await aiService.filterContent(caption);
        if (!filterResult.isSafe) {
          clearInterval(progressInterval);
          alert(`Content flagged: ${filterResult.reason || "Inappropriate content detected."}. Your post will be reviewed.`);
          // We still allow upload but mark as flagged
          if (mode === 'Story') {
            await addStory({
              id: 'story_' + uploadId,
              userId: currentUser.uid,
              userName: currentUser.name,
              userPhoto: currentUser.photoURL,
              mediaUrl: finalMediaData,
              mediaType: mediaType!,
              caption,
              timestamp: Date.now(),
              music: selectedMusic || undefined,
              isFlagged: true,
              flagReason: filterResult.reason
            });
          } else if (mode === 'Post') {
            await addPost({
              userId: currentUser.uid,
              userName: currentUser.name,
              userPhoto: currentUser.photoURL,
              mediaUrl: finalMediaData,
              mediaType: mediaType!,
              caption,
              location: 'ROXX Universe',
              timestamp: Date.now(),
              isFlagged: true,
              flagReason: filterResult.reason
            });
          }
          setUploadProgress(100);
          setTimeout(() => onClose(), 500);
          return;
        }
      }

      if (mode === 'Story') {
        await addStory({
          id: 'story_' + uploadId,
          userId: currentUser.uid,
          userName: currentUser.name,
          userPhoto: currentUser.photoURL,
          mediaUrl: finalMediaData,
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
          mediaUrl: finalMediaData,
          mediaType: mediaType!,
          caption,
          location: 'ROXX Universe',
          timestamp: Date.now()
        });
      }
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => onClose(), 500);
    } catch (e: any) {
      clearInterval(progressInterval);
      console.error("Upload error:", e);
      alert(e.message || "Upload failed. Image might be too large.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAICaption = async () => {
    if (isAIGenerating) return;
    setIsAIGenerating(true);
    setAiModalTitle("Select AI Caption");
    setShowAIModal(true);
    try {
      const options = await aiService.generateCaptionOptions(caption || "something cool");
      setAiOptions(options);
    } catch (e) {
      console.error(e);
      setShowAIModal(false);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleAIHashtags = async () => {
    if (isAIGenerating || !caption) return;
    setIsAIGenerating(true);
    setAiModalTitle("Select AI Hashtags");
    setShowAIModal(true);
    try {
      const tags = await aiService.generateHashtags(caption);
      // For hashtags, we might just want to show them as options or just one option
      setAiOptions([tags]);
    } catch (e) {
      console.error(e);
      setShowAIModal(false);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleAIRefine = async () => {
    if (isAIGenerating || !caption) return;
    setIsAIGenerating(true);
    try {
      const refined = await aiService.refineText(caption);
      setCaption(refined);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAIGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black text-white font-display overflow-hidden animate-in fade-in flex flex-col h-[100dvh]">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Background Media / Camera */}
      <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden" onClick={() => !isCameraReady && !preview && startCamera()}>
        {preview ? (
            <motion.div 
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-full h-full relative flex items-center justify-center transition-all duration-700 ease-out ${selectedFilter.class}`}
            >
                <div className="relative w-full h-full max-w-[450px] aspect-[9/16] shadow-2xl overflow-hidden">
                    {mediaType === 'video' ? (
                        <video src={preview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                    ) : (
                        <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                    )}
                </div>
            </motion.div>
        ) : (
            <div className={`w-full h-full relative ${selectedFilter.class}`}>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isCameraReady ? 'opacity-100' : 'opacity-0'} ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`} 
                />
                {!isCameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-slate-950/60 backdrop-blur-md">
                        {isProcessing ? (
                            <div className="text-center animate-pulse">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 mx-auto"></div>
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Processing Media</p>
                            </div>
                        ) : hasError ? (
                             <div className="text-center p-8 max-w-xs bg-black/40 rounded-[2rem] border border-white/10">
                                <span className="material-symbols-outlined text-5xl text-rose-500 mb-4">videocam_off</span>
                                <p className="text-sm font-bold mb-6 leading-relaxed">{hasError}</p>
                                <button 
                                    onClick={startCamera} 
                                    className="w-full py-4 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                >
                                    Try Again
                                </button>
                             </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Initializing Lens</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Top Controls */}
      <div className="relative z-10 flex items-center justify-between p-6 pt-12">
        <button 
            onClick={onClose} 
            className="flex items-center justify-center size-12 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition-all hover:bg-black/40"
        >
            <span className="material-symbols-outlined">close</span>
        </button>
        
        {!preview && (
            <div className="flex items-center gap-3">
                <button 
                    onClick={handleSwitchCamera} 
                    className="flex items-center justify-center size-12 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 text-white active:bg-white/20 transition-all"
                >
                    <span className="material-symbols-outlined">sync</span>
                </button>
            </div>
        )}
      </div>

      {/* Bottom Controls / Preview UI */}
      <div className="mt-auto relative z-20 w-full flex flex-col items-center pb-10">
        {preview ? (
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full px-6 mb-4"
            >
                <div className="bg-black/40 backdrop-blur-3xl p-6 rounded-[3rem] border border-white/10 flex flex-col gap-6 shadow-2xl">
                    <div className="relative">
                        <textarea 
                            value={caption} 
                            onChange={(e) => setCaption(e.target.value)} 
                            placeholder="Write a caption..." 
                            className="bg-transparent border-none focus:ring-0 text-white placeholder-white/20 text-lg font-bold resize-none h-24 w-full text-center" 
                        />
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/10 rounded-full"></div>
                        
                        {/* AI Tools for Caption */}
                        <div className="flex justify-center gap-2 mt-2">
                            <button 
                                onClick={handleAICaption}
                                disabled={isAIGenerating}
                                className="px-3 py-1.5 bg-primary/20 hover:bg-primary/40 border border-primary/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                            >
                                <span className="material-symbols-outlined text-xs">magic_button</span>
                                {isAIGenerating ? 'Thinking...' : 'AI Caption'}
                            </button>
                            <button 
                                onClick={handleAIHashtags}
                                disabled={isAIGenerating || !caption}
                                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-30"
                            >
                                <span className="material-symbols-outlined text-xs">tag</span>
                                AI Hashtags
                            </button>
                            <button 
                                onClick={handleAIRefine}
                                disabled={isAIGenerating || !caption}
                                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-30"
                            >
                                <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                                Refine
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={() => { setPreview(null); setFile(null); startCamera(); }} 
                            disabled={isUploading} 
                            className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] transition-all active:scale-95"
                        >
                            Retake
                        </button>
                        <button 
                            onClick={handleUpload} 
                            disabled={isUploading} 
                            className="flex-[2] py-5 bg-primary hover:bg-primary-dark text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden"
                        >
                            {isUploading && (
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    className="absolute inset-0 bg-white/20 z-0"
                                />
                            )}
                            <span className="relative z-10">
                                {isUploading ? (
                                    uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Success!'
                                ) : (
                                    <>
                                        <span>Share to {mode}</span>
                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                    </>
                                )}
                            </span>
                        </button>
                    </div>
                </div>
            </motion.div>
        ) : (
            <>
                {/* Filter Selector */}
                <div className="flex w-full overflow-x-auto no-scrollbar px-6 py-4">
                    <div className="flex flex-row items-end justify-center gap-4 mx-auto">
                        {FILTERS.map((f) => (
                            <button 
                                key={f.name} 
                                onClick={() => setSelectedFilter(f)} 
                                className="flex flex-col items-center gap-2 min-w-[60px] group"
                            >
                                <div className={`relative rounded-full transition-all duration-300 overflow-hidden ${selectedFilter.name === f.name ? 'size-14 ring-2 ring-primary ring-offset-2 ring-offset-black scale-110 shadow-lg shadow-primary/40' : 'size-10 border border-white/20 opacity-60 group-hover:opacity-100'}`}>
                                    <img src={f.preview} className="w-full h-full object-cover" alt={f.name} />
                                    {selectedFilter.name === f.name && (
                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-sm">check</span>
                                        </div>
                                    )}
                                </div>
                                <p className={`text-[8px] font-black tracking-widest uppercase transition-colors ${selectedFilter.name === f.name ? 'text-primary' : 'text-white/40'}`}>{f.name}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex items-center justify-center gap-12 p-4 w-full">
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex shrink-0 items-center justify-center rounded-full size-14 bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
                    >
                        <span className="material-symbols-outlined text-2xl">photo_library</span>
                    </button>
                    
                    <button 
                        onClick={handleCapture} 
                        disabled={!isCameraReady} 
                        className="relative flex items-center justify-center group active:scale-110 transition-all"
                    >
                        <div className="absolute size-28 bg-primary/10 rounded-full animate-pulse group-hover:bg-primary/20"></div>
                        <div className="relative flex shrink-0 items-center justify-center rounded-full size-24 border-[8px] border-white/20 bg-white/5 p-1.5 transition-all group-hover:border-white/40">
                            <div className="size-full bg-white rounded-full transition-transform group-active:scale-90 shadow-xl"></div>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => setShowMusicPicker(true)} 
                        className="flex shrink-0 items-center justify-center rounded-full size-14 bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
                    >
                        <span className={`material-symbols-outlined text-2xl ${selectedMusic ? 'text-primary animate-pulse' : ''}`}>music_note</span>
                    </button>
                </div>

                {/* Mode Selector */}
                <div className="flex px-8 mt-8 w-full max-w-sm">
                    <div className="flex h-14 flex-1 items-center justify-center rounded-full bg-white/5 backdrop-blur-2xl p-1.5 border border-white/10">
                        {(['Post', 'Story', 'Live'] as CameraMode[]).map((m) => (
                            <label 
                                key={m} 
                                className={`flex cursor-pointer h-full grow items-center justify-center rounded-full px-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${mode === m ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                            >
                                <span>{m}</span>
                                <input type="radio" className="invisible w-0" name="camera-mode" checked={mode === m} onChange={() => setMode(m)} />
                            </label>
                        ))}
                    </div>
                </div>
            </>
        )}
      </div>
      
      {showMusicPicker && <MusicPicker onClose={() => setShowMusicPicker(false)} onSelect={setSelectedMusic} />}
      
      <AISelectionModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        title={aiModalTitle}
        options={aiOptions}
        isLoading={isAIGenerating}
        onSelect={(opt) => {
          if (aiModalTitle.includes("Hashtags")) {
            setCaption(prev => prev + "\n\n" + opt);
          } else {
            setCaption(opt);
          }
        }}
      />

      {/* iOS Home Indicator Visual */}
      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/20 rounded-full z-[60]"></div>
    </div>
  );
};