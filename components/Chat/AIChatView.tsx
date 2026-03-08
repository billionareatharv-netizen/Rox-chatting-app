import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface AIChatViewProps {
  currentUser: User;
  onClose: () => void;
}

const MODELS = {
  "dev-x": "gemini-3-flash-preview",
  "gpt-oss-120b": "gemini-3.1-pro-preview",
  "llama-3.3-70b-instruct": "gemini-3-flash-preview",
  "gpt-5-nano": "gemini-3-flash-preview",
  "gemini-2.5-flash-lite": "gemini-3.1-flash-lite-preview",
  "qwen3": "gemini-3-flash-preview"
};

export const AIChatView: React.FC<AIChatViewProps> = ({ currentUser, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<keyof typeof MODELS>("gemini-2.5-flash-lite");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load history from localStorage if any
    const saved = localStorage.getItem(`ai_chat_${currentUser.uid}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load AI chat history", e);
      }
    } else {
        // Initial greeting
        setMessages([{
            id: 'init',
            role: 'ai',
            text: "Hey! I'm Roxx AI 🤖. How can I help you today?",
            timestamp: Date.now()
        }]);
    }
  }, [currentUser.uid]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`ai_chat_${currentUser.uid}`, JSON.stringify(messages.slice(-20))); // Keep last 20
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, currentUser.uid]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const modelName = MODELS[selectedModel];
      
      // Prepare history for context
      const history = messages.slice(-5).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
            ...history,
            { role: 'user', parts: [{ text: userMsg.text }] }
        ],
        config: {
            systemInstruction: "You are Roxx AI, a helpful and trendy AI assistant for the Red Rox social media app. Be concise, friendly, and use emojis."
        }
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response.text || "Sorry, I'm having trouble thinking right now. 🤖",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: "Oops! Something went wrong. Please try again later. 🤖",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[200] bg-background-light dark:bg-background-dark flex flex-col"
    >
      {/* Header */}
      <header className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-900 dark:text-white active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">ROXX AI 🤖</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Always Active</p>
          </div>
        </div>
        
        {/* Model Selector */}
        <div className="relative">
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as any)}
            className="bg-slate-100 dark:bg-white/5 border-none rounded-xl text-[10px] font-black uppercase tracking-widest px-3 py-2 pr-8 appearance-none cursor-pointer focus:ring-2 focus:ring-primary transition-all"
          >
            {Object.keys(MODELS).map(m => (
              <option key={m} value={m} className="bg-white dark:bg-slate-900">{m}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs opacity-50">expand_more</span>
        </div>
      </header>

      {/* Chat Container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-5 py-3 rounded-[2rem] text-sm font-medium shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white rounded-tl-none border border-black/5 dark:border-white/5'
              }`}>
                {msg.text}
                <div className={`text-[9px] mt-1 opacity-50 font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-slate-100 dark:bg-white/5 px-5 py-3 rounded-[2rem] rounded-tl-none flex gap-1 items-center border border-black/5 dark:border-white/5">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <footer className="p-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-black/5 dark:border-white/5">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-slate-100 dark:bg-[#2b2839]/60 rounded-[2.5rem] px-5 py-2 shadow-inner border border-transparent dark:border-white/5">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Roxx AI anything..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`size-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              input.trim() && !isTyping ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-300 dark:bg-white/10 text-slate-500'
            }`}
          >
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        </div>
      </footer>
    </motion.div>
  );
};
