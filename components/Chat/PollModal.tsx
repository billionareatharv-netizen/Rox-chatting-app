
import React, { useState } from 'react';

interface PollModalProps {
  onClose: () => void;
  onCreate: (question: string, options: string[]) => void;
}

export const PollModal: React.FC<PollModalProps> = ({ onClose, onCreate }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleAddOption = () => {
    if (options.length < 5) setOptions([...options, '']);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = () => {
    const validOptions = options.filter(opt => opt.trim() !== '');
    if (question.trim() && validOptions.length >= 2) {
      onCreate(question, validOptions);
    } else {
      alert("Please enter a question and at least 2 options.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="bg-card-dark p-8 rounded-[2.5rem] border border-white/10 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
                <span className="material-symbols-outlined">poll</span>
            </div>
            <h3 className="text-xl font-black tracking-tight">Create Poll</h3>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-[#a19cba] tracking-widest ml-1">Question</label>
            <input 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black uppercase text-[#a19cba] tracking-widest ml-1">Options</label>
            {options.map((opt, i) => (
              <input 
                key={i}
                value={opt}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 px-5 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            ))}
            {options.length < 5 && (
              <button 
                onClick={handleAddOption}
                className="text-primary text-[10px] font-black uppercase tracking-widest self-start ml-1 mt-1 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span> Add Option
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button 
              onClick={handleCreate}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              Create Poll
            </button>
            <button 
              onClick={onClose}
              className="w-full py-2 text-[#a19cba] text-[10px] font-black uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
