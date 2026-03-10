
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AISelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: string[];
  onSelect: (option: string) => void;
  title: string;
  isLoading?: boolean;
}

export const AISelectionModal: React.FC<AISelectionModalProps> = ({
  isOpen,
  onClose,
  options,
  onSelect,
  title,
  isLoading = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="bg-background-light dark:bg-[#1d1b27] w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">{title}</h3>
                <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {isLoading ? (
                <div className="py-12 flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Generating Options...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pb-4">
                  {options.length === 0 ? (
                    <p className="text-center py-8 text-sm opacity-50">No options generated. Try again.</p>
                  ) : (
                    options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onSelect(opt);
                          onClose();
                        }}
                        className="w-full p-4 bg-slate-100 dark:bg-white/5 hover:bg-primary/10 hover:border-primary/30 border border-transparent rounded-2xl text-left text-sm font-medium transition-all group active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-900 dark:text-white leading-relaxed">{opt}</span>
                          <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">check_circle</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {!isLoading && (
                <button
                  onClick={onClose}
                  className="w-full py-4 mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-[#a19cba] hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
