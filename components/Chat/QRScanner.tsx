import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader";

  useEffect(() => {
    if (isOpen) {
      const html5QrCode = new Html5Qrcode(scannerId);
      qrScannerRef.current = html5QrCode;

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success
          onScanSuccess(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Error is frequent during scanning, usually ignore
        }
      ).catch((err) => {
        console.error("Scanner start error:", err);
        setError("Camera access denied or not available.");
      });

      return () => {
        stopScanner();
      };
    }
  }, [isOpen]);

  const stopScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      } catch (err) {
        console.error("Stop error:", err);
      }
    }
  };

  const toggleFlash = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        const newState = !isFlashOn;
        await qrScannerRef.current.applyVideoConstraints({
          // @ts-ignore - torch is not in standard types but supported by some browsers
          advanced: [{ torch: newState }]
        });
        setIsFlashOn(newState);
      } catch (err) {
        console.error("Flash error:", err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] bg-black flex flex-col items-center justify-center"
        >
          {/* Camera View */}
          <div id={scannerId} className="w-full h-full"></div>

          {/* Overlay UI */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Scanning Frame */}
            <div className="relative w-64 h-64 border-2 border-white/30 rounded-3xl overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>

              {/* Scanning Line Animation */}
              <motion.div
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(0,255,0,0.8)] z-10"
              />
            </div>

            <p className="mt-8 text-white/70 text-[10px] font-black uppercase tracking-[0.2em] bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
              Align QR code within frame
            </p>
          </div>

          {/* Controls */}
          <div className="absolute top-safe left-0 right-0 p-6 flex items-center justify-between z-50">
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-white text-xs font-black uppercase tracking-widest">Scan Profile QR</h2>
            <button
              onClick={toggleFlash}
              className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-all ${isFlashOn ? 'bg-primary' : 'bg-black/40'}`}
            >
              <span className="material-symbols-outlined">{isFlashOn ? 'flashlight_on' : 'flashlight_off'}</span>
            </button>
          </div>

          {error && (
            <div className="absolute bottom-20 left-6 right-6 p-4 bg-red-500/20 border border-red-500/30 backdrop-blur-md rounded-2xl text-center">
              <p className="text-red-400 text-xs font-bold">{error}</p>
              <button onClick={onClose} className="mt-2 text-white text-[10px] font-black uppercase tracking-widest underline">Go Back</button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
