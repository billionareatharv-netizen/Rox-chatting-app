
import React, { useState, useEffect } from 'react';

interface LockScreenProps {
  storedPin: string;
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ storedPin, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === storedPin.length) {
      if (pin === storedPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 500);
      }
    }
  }, [pin, storedPin, onUnlock]);

  const handlePress = (num: string) => {
    if (pin.length < storedPin.length) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center text-white">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-indigo-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-2xl font-bold">App Locked</h2>
        <p className="text-slate-400 text-sm mt-2">Enter your PIN to continue</p>
      </div>

      <div className="flex gap-4 mb-10">
        {Array.from({ length: storedPin.length }).map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-indigo-500 scale-110' : 'bg-slate-700'} ${error ? 'bg-red-500 animate-pulse' : ''}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button 
            key={num} 
            onClick={() => handlePress(num.toString())}
            className="w-20 h-20 rounded-full bg-slate-800 hover:bg-slate-700 text-2xl font-bold transition-all active:scale-95"
          >
            {num}
          </button>
        ))}
        <div className="w-20 h-20"></div>
        <button 
          onClick={() => handlePress('0')}
          className="w-20 h-20 rounded-full bg-slate-800 hover:bg-slate-700 text-2xl font-bold transition-all active:scale-95"
        >
          0
        </button>
        <button 
          onClick={handleDelete}
          className="w-20 h-20 rounded-full flex items-center justify-center hover:bg-slate-800/50 text-slate-400 transition-all active:scale-95"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
          <span className="sr-only">Delete</span>
        </button>
      </div>
    </div>
  );
};
