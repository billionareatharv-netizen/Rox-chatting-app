
import React, { useState, useEffect, useRef } from 'react';
import { Song, MusicMetadata } from '../../types';
import { getMusicLibrary } from '../../firebase';

interface MusicPickerProps {
  onClose: () => void;
  onSelect: (metadata: MusicMetadata) => void;
}

const CATEGORIES = ['All', 'Trending', 'Love', 'Sad', 'Chill', 'Party'];

export const MusicPicker: React.FC<MusicPickerProps> = ({ onClose, onSelect }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  
  // Trimmer State
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [startAt, setStartAt] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const load = async () => {
      const data = await getMusicLibrary();
      setSongs(data);
      setFilteredSongs(data);
    };
    load();
  }, []);

  useEffect(() => {
    let res = songs;
    if (category !== 'All') res = res.filter(s => s.category === category);
    if (search) res = res.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.artist.toLowerCase().includes(search.toLowerCase()));
    setFilteredSongs(res);
  }, [category, search, songs]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = 0.5;
        if (previewSong) {
            audioRef.current.src = previewSong.url;
            audioRef.current.play().catch(() => {});
        } else {
            audioRef.current.pause();
        }
    }
  }, [previewSong]);

  const handleConfirm = () => {
      if (!selectedSong) return;
      onSelect({
          songId: selectedSong.id,
          url: selectedSong.url,
          title: selectedSong.title,
          artist: selectedSong.artist,
          startAt: startAt,
          duration: 15 // Default 15s clip
      });
      onClose();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      setStartAt(val);
      if (audioRef.current && selectedSong) {
          audioRef.current.currentTime = val;
          if (audioRef.current.paused) audioRef.current.play();
      }
  };

  return (
    <div className="fixed inset-0 z-[400] flex flex-col items-center justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md h-[80vh] bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Music Library</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Hidden Audio Player */}
        <audio ref={audioRef} onEnded={() => setPreviewSong(null)} />

        {/* Trimmer View (If Song Selected) */}
        {selectedSong ? (
            <div className="flex-1 flex flex-col p-8 items-center text-center">
                <div className="w-32 h-32 bg-indigo-500/10 rounded-2xl mb-6 flex items-center justify-center shadow-lg">
                    <span className="text-4xl">🎵</span>
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{selectedSong.title}</h4>
                <p className="text-slate-500 font-medium mb-8">{selectedSong.artist}</p>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-16 rounded-xl relative overflow-hidden mb-4">
                    {/* Visual representation of waveform (fake) */}
                    <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-30">
                        {Array.from({length: 40}).map((_, i) => (
                            <div key={i} className="w-1 bg-indigo-500 rounded-full" style={{ height: `${Math.random() * 100}%` }}></div>
                        ))}
                    </div>
                    {/* Active Window Indicator */}
                    <div 
                        className="absolute top-0 bottom-0 border-2 border-indigo-500 bg-indigo-500/20 w-[20%] pointer-events-none"
                        style={{ left: `${(startAt / selectedSong.duration) * 100}%` }}
                    ></div>
                </div>

                <input 
                    type="range" 
                    min="0" 
                    max={selectedSong.duration - 15} 
                    value={startAt} 
                    onChange={handleSeek} 
                    className="w-full mb-8 accent-indigo-500" 
                />
                
                <div className="flex w-full gap-4">
                    <button onClick={() => { setSelectedSong(null); setPreviewSong(null); }} className="flex-1 py-4 font-bold text-slate-500 uppercase text-xs">Back</button>
                    <button onClick={handleConfirm} className="flex-[2] py-4 bg-indigo-500 text-white rounded-2xl font-bold uppercase text-xs shadow-lg shadow-indigo-500/30">Attach Song</button>
                </div>
            </div>
        ) : (
            <>
                {/* Search & Categories */}
                <div className="px-6 pb-2">
                    <input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Search songs, artists..." 
                        className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl outline-none font-bold text-sm mb-4"
                    />
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {CATEGORIES.map(c => (
                            <button 
                                key={c} 
                                onClick={() => setCategory(c)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${category === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Song List */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
                    {filteredSongs.map(song => (
                        <div key={song.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 group cursor-pointer" onClick={() => { setSelectedSong(song); setPreviewSong(song); }}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{song.title}</h4>
                                    <p className="text-xs text-slate-500">{song.artist}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (previewSong?.id === song.id) setPreviewSong(null);
                                        else setPreviewSong(song);
                                    }} 
                                    className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-indigo-500 hover:scale-110 transition-transform"
                                >
                                    {previewSong?.id === song.id ? (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}
      </div>
    </div>
  );
};
