import React, { useEffect, useState } from 'react';
import { User, SavedMedia } from '../../types';
import { getSavedGallery, deleteSavedMedia } from '../../firebase';

interface AppGalleryProps {
  currentUser: User;
  onClose: () => void;
}

export const AppGallery: React.FC<AppGalleryProps> = ({ currentUser, onClose }) => {
  const [items, setItems] = useState<SavedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState<SavedMedia | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await getSavedGallery(currentUser.uid);
      setItems(data as SavedMedia[]);
      setLoading(false);
    };
    load();
  }, [currentUser.uid]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Remove this item from gallery?")) {
      await deleteSavedMedia(id);
      setItems(prev => prev.filter(i => i.id !== id));
      if (viewItem?.id === id) setViewItem(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 bg-white dark:bg-slate-900">
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
          <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">App Gallery</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{items.length} saved items</p>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60 gap-4">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="font-bold text-sm">Gallery is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {items.map(item => (
              <div 
                key={item.id} 
                onClick={() => setViewItem(item)}
                className="relative aspect-square bg-slate-100 dark:bg-slate-800 cursor-pointer overflow-hidden group"
              >
                {item.mediaType === 'video' ? (
                  <video src={item.mediaUrl} className="w-full h-full object-cover" />
                ) : (
                  <img src={item.mediaUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                )}
                {item.mediaType === 'video' && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-4 h-4 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Screen View */}
      {viewItem && (
        <div className="fixed inset-0 z-[310] bg-black flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 inset-x-0 p-4 flex justify-between bg-gradient-to-b from-black/80 to-transparent z-[320]">
            <button onClick={() => setViewItem(null)} className="p-2 text-white hover:bg-white/10 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <button onClick={() => handleDelete(viewItem.id)} className="p-2 text-red-500 hover:bg-white/10 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          <div className="flex-1 w-full h-full flex items-center justify-center">
            {viewItem.mediaType === 'video' ? (
              <video src={viewItem.mediaUrl} controls autoPlay className="max-w-full max-h-full" />
            ) : (
              <img src={viewItem.mediaUrl} className="max-w-full max-h-full object-contain" alt="" />
            )}
          </div>
          <div className="absolute bottom-8 text-white/70 text-xs font-bold uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
            Saved from {viewItem.originalSenderName}
          </div>
        </div>
      )}
    </div>
  );
};