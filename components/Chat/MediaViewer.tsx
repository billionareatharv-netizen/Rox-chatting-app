import React, { useState, useEffect } from 'react';
import { Message, User } from '../../types';
import { saveMediaToGallery } from '../../firebase';

interface MediaViewerProps {
  message: Message;
  currentUser: User; // Added currentUser to get correct ID for saving
  onClose: () => void;
  onForward: (msg: Message) => void;
  onReply: (msg: Message) => void;
  onSave?: (msg: Message) => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({ message, currentUser, onClose, onForward, onReply, onSave }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = async () => {
    if (!message.fileUrl) return;
    try {
      const response = await fetch(message.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = message.fileName || `roxx_media_${Date.now()}.${message.type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setShowMenu(false);
    } catch (e) {
      console.error("Download failed", e);
      // Fallback for cross-origin issues
      window.open(message.fileUrl, '_blank');
    }
  };

  const handleSaveToApp = async () => {
    if (message.fileUrl && (message.type === 'image' || message.type === 'video')) {
        // FIX: Use currentUser.uid to ensure it saves to the person viewing the gallery
        await saveMediaToGallery(
            currentUser.uid, 
            message.fileUrl, 
            message.type,
            message.senderId === currentUser.uid ? 'You' : 'Sender'
        );
        setIsSaved(true);
        if (onSave) onSave(message);
        setTimeout(() => {
            setIsSaved(false);
            setShowMenu(false);
        }, 2000);
    }
  };

  const handleReplyClick = () => {
    onReply(message);
    onClose();
  };

  const handleForwardClick = () => {
    onForward(message);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
      
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 z-[260] p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full transition-all">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm">{message.senderId === currentUser.uid ? 'You' : 'Media View'}</span>
            <span className="text-white/60 text-xs">{new Date(message.timestamp).toLocaleString()}</span>
          </div>
        </div>

        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-white hover:bg-white/10 rounded-full transition-all">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl py-2 overflow-hidden animate-in zoom-in-95 origin-top-right">
               <button onClick={handleSaveToApp} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  Save to Gallery
               </button>
               <button onClick={handleDownload} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
               </button>
               <button onClick={handleForwardClick} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  Forward
               </button>
               <button onClick={handleReplyClick} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  Reply
               </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full h-full flex items-center justify-center p-4">
        {message.type === 'video' ? (
           <video 
             src={message.fileUrl} 
             controls 
             autoPlay 
             className="max-w-full max-h-full object-contain shadow-2xl"
           />
        ) : (
           <img 
             src={message.fileUrl} 
             alt="Full View" 
             className="max-w-full max-h-full object-contain shadow-2xl"
           />
        )}
      </div>
      
      {/* Toast Notification for Save */}
      {isSaved && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl animate-in slide-in-from-bottom-5 z-[300]">
              Media Saved to App Gallery
          </div>
      )}
    </div>
  );
};