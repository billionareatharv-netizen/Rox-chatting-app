
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

  // Feature Toggles (Visual Feedback)
  const [flashOn, setFlashOn] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [magicOn, setMagicOn] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File size limit logic: standalone detection
  const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const MAX_SIZE_MB = isApp ? 150 : 15;

  useEffect(() => {
    return () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`File is too large. Limit for ${isApp ? 'App' : 'Browser'} is ${MAX_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }
    
    const isVideo = selected.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setFile(selected);
    
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!file || !preview) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const mediaData = reader.result as string;

        if (mode === 'Story') {
          const newStory: Story = {
            id: crypto.randomUUID(),
            userId: currentUser.uid,
            userName: currentUser.name,
            userPhoto: currentUser.photoURL,
            mediaUrl: mediaData,
            mediaType: mediaType!,
            caption,
            timestamp: Date.now(),
            music: selectedMusic || undefined
          };
          await addStory(newStory);
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
      };
    } catch (e) {
      alert("Failed to upload. Media might be too large.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black text-white font-display overflow-hidden animate-in fade-in flex flex-col h-[100dvh]">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />

      {/* Camera Viewfinder Background */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">
        {preview ? (
            <div className={`w-full h-full relative transition-all duration-500 ${selectedFilter.class}`}>
                {mediaType === 'video' ? (
                    <video src={preview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                    <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                )}
                <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
            </div>
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center opacity-30 gap-4">
                <span className="material-symbols-outlined text-8xl">camera_enhance</span>
                <p className="font-black tracking-[0.3em] uppercase text-sm">Viewfinder Ready</p>
            </div>
        )}
      </div>

      {/* Top Controls Overlay - No simulated iOS bars */}
      <div className="relative z-10 flex items-center justify-between p-6 pt-10">
        <button 
            onClick={onClose} 
            className="flex items-center justify-center size-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white transition-all active:scale-90"
        >
            <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex gap-2">
            <button className="flex items-center justify-center size-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white active:bg-white/20">
                <span className="material-symbols-outlined">settings</span>
            </button>
        </div>
      </div>

      {/* Floating Vertical Toolbar (Right Side) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
        <div className="flex flex-col gap-2 p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
            <button onClick={() => setFlashOn(!flashOn)} className={`p-3 transition-colors ${flashOn ? 'text-yellow-400' : 'text-white'}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: flashOn ? "'FILL' 1" : "" }}>flash_on</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-white hover:text-primary transition-all active:rotate-180">
                <span className="material-symbols-outlined">sync</span>
            </button>
            <button onClick={() => setTimerOn(!timerOn)} className={`p-3 transition-colors ${timerOn ? 'text-primary' : 'text-white'}`}>
                <span className="material-symbols-outlined">timer</span>
            </button>
            <button onClick={() => setMagicOn(!magicOn)} className={`p-3 transition-colors ${magicOn ? 'text-primary' : 'text-white'}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: magicOn ? "'FILL' 1" : "" }}>magic_button</span>
            </button>
            <button onClick={() => setShowMusicPicker(true)} className={`p-3 transition-colors ${selectedMusic ? 'text-primary' : 'text-white'}`}>
                <span className="material-symbols-outlined">music_note</span>
            </button>
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="mt-auto relative z-20 w-full flex flex-col items-center">
        
        {/* Caption Panel (Visible only when file is selected) */}
        {preview && (
            <div className="w-full px-6 mb-4 animate-in slide-in-from-bottom-10">
                <div className="bg-black/60 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/10 flex flex-col gap-5 shadow-2xl">
                    <textarea 
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write a creative caption..."
                        className="bg-transparent border-none focus:ring-0 text-white placeholder-white/30 text-sm font-bold resize-none h-20 w-full text-center"
                    />
                    {selectedMusic && (
                        <div className="flex items-center justify-center gap-3 bg-white/10 py-2 px-4 rounded-2xl animate-pulse">
                            <span className="text-xs font-black">🎵 {selectedMusic.title} - {selectedMusic.artist}</span>
                            <button onClick={() => setSelectedMusic(null)} className="text-white/40 hover:text-white">✕</button>
                        </div>
                    )}
                    <button 
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="w-full py-5 bg-primary text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isUploading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            `Publish ${mode}`
                        )}
                    </button>
                </div>
            </div>
        )}

        {/* Filter Carousel - Only visible when NO preview */}
        {!preview && (
            <div className="flex w-full overflow-x-auto no-scrollbar px-4 py-6 scroll-smooth">
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
                    className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-xl border border-white/10 text-white transition-transform active:scale-90 overflow-hidden"
                >
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/30 bg-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">photo_library</span>
                    </div>
                </button>

                {/* Capture Button Container */}
                <div className="relative flex items-center justify-center group" onClick={() => fileInputRef.current?.click()}>
                    <div className="absolute size-24 bg-primary/20 rounded-full animate-pulse group-active:scale-125 transition-transform"></div>
                    <button className="relative flex shrink-0 items-center justify-center rounded-full size-20 border-[6px] border-white/40 bg-white/5 p-1">
                        <div className="size-full bg-white rounded-full transition-transform group-active:scale-90 shadow-[0_0_20px_2px_rgba(242,13,128,0.4)]"></div>
                    </button>
                </div>

                <button className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-xl border border-white/10 text-white transition-transform active:scale-90">
                    <span className="material-symbols-outlined text-[28px]">photo_filter</span>
                </button>
            </div>
        )}

        {/* Mode Selector */}
        {!preview && (
            <div className="flex px-8 pb-10 w-full max-w-sm">
                <div className="flex h-12 flex-1 items-center justify-center rounded-full bg-black/40 backdrop-blur-xl p-1.5 border border-white/10">
                    {(['Post', 'Story', 'Live'] as CameraMode[]).map((m) => (
                        <label key={m} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-full px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === m ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>
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
