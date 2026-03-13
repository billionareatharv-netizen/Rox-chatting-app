import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';

interface QRCodeModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ user, isOpen, onClose }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const profileUrl = `${window.location.origin}/?user=${user.uid}`;

  const downloadQRCode = () => {
    const canvas = document.getElementById('profile-qr') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qr-profile-${user.username || 'user'}.png`;
      link.href = url;
      link.click();
    }
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user.name}'s Profile`,
          text: `Check out ${user.name}'s profile on Red Rox!`,
          url: profileUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      navigator.clipboard.writeText(profileUrl);
      alert('Profile link copied to clipboard!');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-white dark:bg-card-dark rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
          >
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border-2 border-primary/20">
                <img src={user.photoURL} className="w-full h-full object-cover" alt="" />
              </div>
              <h3 className="text-xl font-black tracking-tight mb-1">{user.name}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8">@{user.username || 'user'}</p>

              <div className="bg-white p-4 rounded-3xl shadow-inner mb-8" ref={canvasRef}>
                <QRCodeCanvas
                  id="profile-qr"
                  value={profileUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: user.photoURL,
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>

              <div className="w-full grid grid-cols-2 gap-3">
                <button
                  onClick={downloadQRCode}
                  className="h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Save
                </button>
                <button
                  onClick={shareProfile}
                  className="h-12 bg-primary text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">share</span>
                  Share
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
