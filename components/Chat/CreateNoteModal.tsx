import React, { useState } from 'react';
import { User, MusicMetadata } from '../../types';
import { addNote } from '../../firebase';
import { MusicPicker } from './MusicPicker';

interface CreateNoteModalProps {
  currentUser: User;
  onClose: () => void;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({ currentUser, onClose }) => {
  const [noteText, setNoteText] = useState('');
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicMetadata | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!noteText.trim()) return;
    setIsSharing(true);
    try {
        await addNote(
            currentUser.uid, 
            currentUser.name, 
            currentUser.photoURL, 
            noteText.trim().substring(0, 60), 
            selectedMusic || undefined
        );
        onClose();
    } catch (e) {
        alert("Failed to share note.");
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-background-light dark:bg-background-dark font-display text-white animate-in fade-in flex items-center justify-center">
        <style>{`
            .thought-bubble::after {
                content: '';
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 12px solid transparent;
                border-right: 12px solid transparent;
                border-top: 12px solid #1d1b27;
            }
            .share-button-glow {
                box-shadow: 0 0 15px rgba(51, 13, 242, 0.4);
                background: linear-gradient(135deg, #330df2 0%, #5b39f9 100%);
            }
        `}</style>

        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden max-w-[430px] bg-background-light dark:bg-background-dark shadow-2xl">
            {/* Header */}
            <header className="flex items-center justify-between p-6 pt-12">
                <button onClick={onClose} className="text-[#a19cba] text-base font-medium active:opacity-60 transition-opacity">Cancel</button>
                <h2 className="text-white text-lg font-bold tracking-tight">New Note</h2>
                <button 
                    onClick={handleShare}
                    disabled={!noteText.trim() || isSharing}
                    className={`share-button-glow px-5 py-2 rounded-full text-white text-sm font-bold tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:grayscale`}
                >
                    {isSharing ? '...' : 'Share'}
                </button>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-start pt-10 px-6 gap-8">
                {/* Thought Bubble & Profile Section */}
                <div className="relative flex flex-col items-center w-full">
                    {/* Thought Bubble */}
                    <div className="relative thought-bubble w-full max-w-[280px] bg-[#1d1b27] border border-[#3f3b54]/50 rounded-2xl p-5 mb-6 shadow-xl animate-in zoom-in-95">
                        <textarea 
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="form-input w-full bg-transparent border-none focus:ring-0 p-0 text-white text-center text-lg font-medium placeholder:text-[#a19cba]/50 resize-none min-h-[60px]" 
                            maxLength={60} 
                            placeholder="What's on your mind?"
                            autoFocus
                        />
                        <p className="text-[#a19cba] text-[10px] font-medium text-right mt-2 opacity-60">{noteText.length} / 60</p>
                    </div>

                    {/* Profile Avatar */}
                    <div className="relative">
                        <div className="size-28 rounded-full border-4 border-[#1d1b27] overflow-hidden shadow-2xl">
                            <img alt="" className="w-full h-full object-cover" src={currentUser.photoURL} />
                        </div>
                        {/* Status Indicator */}
                        <div className="absolute bottom-1 right-2 size-6 bg-green-500 rounded-full border-4 border-background-dark"></div>
                    </div>
                </div>

                {/* Music Interaction Section */}
                <div className="w-full flex flex-col gap-4 mt-4 overflow-y-auto no-scrollbar pb-10">
                    {selectedMusic ? (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 animate-in slide-in-from-bottom-2">
                             <span className="text-2xl">🎵</span>
                             <div className="flex-1">
                                <p className="text-white text-sm font-bold truncate">{selectedMusic.title}</p>
                                <p className="text-[#a19cba] text-xs truncate">{selectedMusic.artist}</p>
                             </div>
                             <button onClick={() => setSelectedMusic(null)} className="text-white/40 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                             </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setShowMusicPicker(true)}
                            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-primary">music_note</span>
                            <span className="text-white font-semibold">Add Music</span>
                        </button>
                    )}

                    <p className="text-[#a19cba] text-xs font-bold uppercase tracking-widest px-1 mt-2">Trending for you</p>
                    
                    <div className="flex flex-col gap-3">
                        {/* Mock Trending items matching your UI */}
                        {[
                            { title: 'Midnight City', artist: 'M83 • Hurry Up, We\'re Dreaming', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLuhVIJN3QANIZXdyc6lEd1NL7e4_f9fmOshK9zr5art9VXthcSKNUGCTtzXEFJbXO3l0pYQrxXKf_6a_SIJblbr3p8jJRpfzlJm_ZJgmKd_BvJlac9gBm_d4vTvZ6UUPka4p0jwvjuWaqpQLTMBcbS8FC3AW3pTq59ROb1FWLiYKFzoi-3NPYgC6xdgOsNsSjlm74ALwfU7IeLp9bcQHkELXRHEJjQ_IFcBqD0j9VzMRp6xTCpBWWSkzCN0Up99x09EQXgRlH' },
                            { title: 'Starboy', artist: 'The Weeknd • Starboy', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDIKdANphaNYhK2ZN67YeRG4aaNc-Pt79egBa9iopBNI2EeaHg9OonDJnvWfaPGX1_4zFPLAgQdVyWfL4nZa0vq0EsmHlgj5xx2IrjobY7oVwm33oWwYvnjaEQvDrY3OeugdN6iwlgxJwnoLZ2UEtjmkKeBkRWP8_zDePjWy4egiiXfkN78u2BjUAe3DIwxarAB4ZqP1ANP2qKBI4W9xzUqeUGf4yECTVAyTEY5hm4VcbSGPEKlXz2ziMzA4Ni3NjjeBUNfTGbU' }
                        ].map((track, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#1d1b27]/40 border border-[#3f3b54]/20 opacity-80 hover:opacity-100 transition-opacity">
                                <div className="size-12 rounded-lg overflow-hidden bg-primary/20 flex-shrink-0">
                                    <img alt="" className="w-full h-full object-cover opacity-80" src={track.img} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-bold truncate">{track.title}</p>
                                    <p className="text-[#a19cba] text-xs truncate">{track.artist}</p>
                                </div>
                                <span className="material-symbols-outlined text-[#a19cba] size-6 cursor-pointer hover:text-white transition-colors">play_circle</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* iOS Indicator */}
            <div className="w-full flex justify-center pb-8 pt-4">
                <div className="w-32 h-1.5 bg-white/20 rounded-full"></div>
            </div>
        </div>

        {showMusicPicker && (
            <div className="fixed inset-0 z-[700] animate-in slide-in-from-bottom">
                <MusicPicker onClose={() => setShowMusicPicker(false)} onSelect={(m) => { setSelectedMusic(m); setShowMusicPicker(false); }} />
            </div>
        )}
    </div>
  );
};