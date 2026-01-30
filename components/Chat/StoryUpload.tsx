
import React, { useState, useRef, useEffect } from 'react';
import { User, Story, MusicMetadata } from '../../types';
import { addStory } from '../../firebase';
import { hasPremiumAccess } from '../../premiumUtils';
import { MusicPicker } from './MusicPicker';

interface StoryUploadProps {
  currentUser: User;
  onClose: () => void;
}

const BG_COLORS = [
    '#1e293b', // Slate 800
    '#be185d', // Pink 700
    '#4338ca', // Indigo 700
    '#0f766e', // Teal 700
    '#b45309', // Amber 700
    '#7f1d1d', // Red 900
    'linear-gradient(45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
    'linear-gradient(to top, #30cfd0 0%, #330867 100%)'
];

export const StoryUpload: React.FC<StoryUploadProps> = ({ currentUser, onClose }) => {
  const [mode, setMode] = useState<'media' | 'text'>('media');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicMetadata | null>(null);
  
  // Text Mode State
  const [textStatus, setTextStatus] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [textStyle, setTextStyle] = useState<'normal' | 'bold' | 'italic'>('bold');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Premium Check
  const hasLongStatus = hasPremiumAccess(currentUser, 'status_duration_boost');

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1080;
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const generateTextImage = (): string => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if(!ctx) return '';

      // Background
      if(bgColor.includes('gradient')) {
          const grad = ctx.createLinearGradient(0, 0, 0, 1920);
          ctx.fillStyle = '#1e293b'; 
          if(bgColor.includes('#ee7752')) {
              const g = ctx.createLinearGradient(0,0,1080,1920);
              g.addColorStop(0, '#ee7752'); g.addColorStop(1, '#23d5ab');
              ctx.fillStyle = g;
          } else if(bgColor.includes('#30cfd0')) {
              const g = ctx.createLinearGradient(0,1920,0,0);
              g.addColorStop(0, '#30cfd0'); g.addColorStop(1, '#330867');
              ctx.fillStyle = g;
          }
      } else {
          ctx.fillStyle = bgColor;
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Text
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = textStatus.length < 50 ? 80 : 50;
      ctx.font = `${textStyle === 'bold' ? 'bold' : textStyle === 'italic' ? 'italic' : ''} ${fontSize}px sans-serif`;
      
      const words = textStatus.split(' ');
      let line = '';
      const lines = [];
      const maxWidth = 900;
      
      for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
              lines.push(line);
              line = words[n] + ' ';
          } else {
              line = testLine;
          }
      }
      lines.push(line);

      const lineHeight = fontSize * 1.4;
      const startY = 960 - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((l, i) => {
          ctx.fillText(l, 540, startY + (i * lineHeight));
      });

      return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const limit = hasLongStatus ? 15 : 5;
    if (selected.size > limit * 1024 * 1024) {
      alert(`File is too large. Limit is ${limit}MB.`);
      e.target.value = '';
      return;
    }
    
    const isVideo = selected.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setFile(selected);
    
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
    e.target.value = '';
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      let mediaData: string;
      let type: 'image' | 'video' = 'image';

      if (mode === 'text') {
          if(!textStatus.trim()) return;
          mediaData = generateTextImage();
      } else {
          if (!file || !mediaType) return;
          type = mediaType;
          if (mediaType === 'image') {
            mediaData = await compressImage(file);
          } else {
            mediaData = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("Failed to read video"));
              reader.readAsDataURL(file);
            });
          }
      }

      const newStory: Story = {
        id: crypto.randomUUID(),
        userId: currentUser.uid,
        userName: currentUser.name,
        userPhoto: currentUser.photoURL,
        mediaUrl: mediaData,
        mediaType: type,
        caption: mode === 'media' ? caption : '',
        timestamp: Date.now(),
        music: selectedMusic || undefined
      };

      await addStory(newStory);
      onClose();
    } catch (e) {
      console.error("Upload error:", e);
      alert("Storage full or file too large for browser.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />

      {/* Top Controls */}
      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-[110]">
          <button onClick={onClose} className="p-3 text-white hover:bg-white/10 rounded-full transition-all">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {!preview && mode === 'media' && (
              <div className="flex bg-slate-800 rounded-full p-1 border border-slate-700">
                  <button onClick={() => setMode('media')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'media' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>Media</button>
                  <button onClick={() => setMode('text')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'text' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>Text</button>
              </div>
          )}
      </div>

      {mode === 'text' ? (
          <div className="w-full h-full flex flex-col animate-in fade-in">
              <div 
                className="flex-1 flex items-center justify-center p-8 transition-colors duration-500 relative"
                style={{ background: bgColor }}
              >
                  <textarea 
                    value={textStatus} 
                    onChange={e => setTextStatus(e.target.value)} 
                    placeholder="Type a status..." 
                    className={`w-full max-w-lg bg-transparent text-white text-center text-3xl outline-none resize-none placeholder-white/50 ${textStyle === 'bold' ? 'font-bold' : textStyle === 'italic' ? 'italic' : ''}`}
                    rows={5}
                    autoFocus
                  />
                  
                  <button 
                    onClick={() => setTextStyle(prev => prev === 'normal' ? 'bold' : prev === 'bold' ? 'italic' : 'normal')}
                    className="absolute top-20 right-6 w-10 h-10 bg-black/20 rounded-full text-white font-serif flex items-center justify-center backdrop-blur-md"
                  >
                      {textStyle === 'normal' ? 'Aa' : textStyle === 'bold' ? 'B' : 'I'}
                  </button>

                  {/* Music Sticker (Preview) */}
                  {selectedMusic && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-32 bg-white/20 backdrop-blur-md p-2 rounded-xl flex items-center gap-3 pr-4">
                          <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center text-white">🎵</div>
                          <div className="text-left">
                              <p className="text-white text-xs font-bold">{selectedMusic.title}</p>
                              <p className="text-white/70 text-[10px]">{selectedMusic.artist}</p>
                          </div>
                          <button onClick={() => setSelectedMusic(null)} className="text-white opacity-60 hover:opacity-100">✕</button>
                      </div>
                  )}
              </div>

              <div className="bg-black/80 p-6 pb-10 flex flex-col gap-6">
                  <div className="flex gap-3 overflow-x-auto no-scrollbar justify-center px-4">
                      {BG_COLORS.map(c => (
                          <button 
                            key={c} 
                            onClick={() => setBgColor(c)} 
                            className={`w-8 h-8 rounded-full border-2 ${bgColor === c ? 'border-white scale-110' : 'border-transparent opacity-70'} transition-all`}
                            style={{ background: c }}
                          />
                      ))}
                  </div>
                  <div className="flex items-center gap-4 px-4">
                      <button onClick={() => setShowMusicPicker(true)} className="p-3 bg-slate-800 rounded-full text-white"><span className="text-lg">🎵</span></button>
                      <button 
                        onClick={handleUpload}
                        disabled={!textStatus.trim() || isUploading}
                        className="flex-1 py-4 bg-indigo-500 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"
                      >
                          {isUploading ? 'Posting...' : 'Share Status'}
                      </button>
                  </div>
              </div>
          </div>
      ) : (
          !preview ? (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Share a Moment</h2>
              
              <div className="flex gap-4">
                  <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all">
                    Choose Media
                  </button>
                  <button onClick={() => setMode('text')} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all">
                    Type Text
                  </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col bg-black">
              <div className="flex-1 relative flex items-center justify-center bg-black">
                {mediaType === 'video' ? (
                  <video key={preview} src={preview} className="max-h-full w-full object-contain" autoPlay muted loop playsInline />
                ) : (
                  <img src={preview} alt="Preview" className="max-h-full w-full object-contain" />
                )}
                
                {/* Music Sticker */}
                {selectedMusic && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-md p-3 rounded-xl flex items-center gap-3 pr-4 border border-white/20 animate-in zoom-in">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white text-2xl">🎵</div>
                        <div className="text-left">
                            <p className="text-white text-sm font-bold">{selectedMusic.title}</p>
                            <p className="text-white/70 text-xs">{selectedMusic.artist}</p>
                        </div>
                        <button onClick={() => setSelectedMusic(null)} className="text-white ml-2 opacity-60 hover:opacity-100">✕</button>
                    </div>
                )}

                <div className="absolute bottom-4 inset-x-4">
                   <input 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 text-white placeholder-white/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm text-center"
                  />
                </div>
              </div>

              <div className="p-4 flex gap-4 bg-black">
                <button 
                  onClick={() => setShowMusicPicker(true)}
                  className="p-4 bg-slate-800 rounded-2xl text-white hover:bg-slate-700"
                >
                    <span className="text-xl">🎵</span>
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-[2] py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {isUploading ? 'Posting...' : 'Share Story'}
                </button>
              </div>
            </div>
          )
      )}

      {showMusicPicker && (
          <MusicPicker 
            onClose={() => setShowMusicPicker(false)}
            onSelect={setSelectedMusic}
          />
      )}
    </div>
  );
};
