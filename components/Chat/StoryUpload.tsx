
import React, { useState, useRef, useEffect } from 'react';
import { User, Story } from '../../types';
import { addStory } from '../../firebase';

interface StoryUploadProps {
  currentUser: User;
  onClose: () => void;
}

export const StoryUpload: React.FC<StoryUploadProps> = ({ currentUser, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Helper to compress images using Canvas
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
          
          // Compress to JPEG with 0.6 quality (High enough for mobile, small enough for storage)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Limit videos to 5MB, Images to 5MB (compression will handle images)
    if (selected.size > 5 * 1024 * 1024) {
      alert("File is too large. Please select a file under 5MB.");
      e.target.value = '';
      return;
    }
    
    const isVideo = selected.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setFile(selected);
    
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    
    const objectUrl = URL.createObjectURL(selected);
    setPreview(objectUrl);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!file || !mediaType) return;
    setIsUploading(true);

    try {
      let mediaData: string;

      if (mediaType === 'image') {
        mediaData = await compressImage(file);
      } else {
        // For videos, we use standard Base64 (compression is complex in browser without worker)
        mediaData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read video"));
          reader.readAsDataURL(file);
        });
      }

      const newStory: Story = {
        id: crypto.randomUUID(),
        userId: currentUser.uid,
        userName: currentUser.name,
        userPhoto: currentUser.photoURL,
        mediaUrl: mediaData,
        mediaType: mediaType,
        caption: caption,
        timestamp: Date.now()
      };

      await addStory(newStory);
      onClose();
    } catch (e) {
      console.error("Upload error:", e);
      alert("Storage full! The app tried to clear space, but this video is still too large for your browser's memory.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,video/*" 
        className="hidden" 
      />

      <button 
        onClick={onClose} 
        className="absolute top-6 left-6 p-3 text-white hover:bg-white/10 rounded-full transition-all z-[110]"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {!preview ? (
        <div className="text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Share a Moment</h2>
          <p className="text-white/40 max-w-xs mx-auto text-sm">
            Optimized storage enabled. Large images are automatically compressed.
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
          >
            Choose Media
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col gap-4 animate-in slide-in-from-bottom-10 duration-500">
          <div className="relative aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {mediaType === 'video' ? (
              <video 
                key={preview}
                src={preview} 
                className="w-full h-full object-contain" 
                autoPlay 
                muted 
                loop 
                playsInline 
              />
            ) : (
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            )}
            
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
               <textarea 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all text-sm"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => { setFile(null); setPreview(null); setMediaType(null); }}
              className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-[2] py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                'Post Story'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
