import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';
import OpenAI from 'openai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIChatViewProps {
  currentUser: User;
  onClose: () => void;
}

const MODELS = {
  "dev-x": "dev-x",
  "gpt-oss-120b": "gpt-oss-120b",
  "llama-3.3-70b-instruct": "llama-3.3-70b-instruct",
  "gpt-5-nano": "gpt-5-nano",
  "gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
  "qwen3": "qwen3"
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
            role: 'assistant',
            content: "Hey! I'm Roxx AI 🤖. How can I help you today?",
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
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const client = new OpenAI({
        baseURL: "https://aimodelapi.onrender.com/v1",
        apiKey: "devx-5xc0eda8tc5rcjgvuo0kxio4wncq1o1v",
        dangerouslyAllowBrowser: true
      });

      const modelId = MODELS[selectedModel];
      
      // Prepare history for context
      const history = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await client.chat.completions.create({
        model: modelId,
        messages: [
            { role: 'system', content: "You are Roxx AI, a helpful and trendy AI assistant for the Red Rox social media app. Be concise, friendly, and use emojis." },
            ...history,
            { role: 'user', content: userMsg.content }
        ]
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.choices[0].message.content || "Sorry, I'm having trouble thinking right now. 🤖",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oops! Something went wrong. Please try again later. 🤖",
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
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 no-scrollbar bg-white dark:bg-background-dark"
      >
        <div className="max-w-3xl mx-auto space-y-8">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white' 
                      : 'text-slate-800 dark:text-slate-200'
                  }`}>
                      {msg.content}
                  </div>
                  <div className="text-[9px] mt-1.5 opacity-30 font-bold uppercase tracking-widest">
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
              className="flex gap-4"
            >
              <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                AI
              </div>
              <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-2xl flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-duration:0.8s]"></div>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]"></div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <footer className="p-4 md:p-10 bg-white dark:bg-background-dark">
        <div className="max-w-3xl mx-auto relative">
          <textarea 
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message Roxx AI..."
            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pr-14 outline-none focus:border-primary/50 transition-all resize-none text-[15px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`absolute right-2.5 bottom-2.5 size-10 rounded-xl flex items-center justify-center transition-all ${
              input.trim() && !isTyping ? 'bg-primary text-white shadow-lg' : 'bg-slate-200 dark:bg-white/10 text-slate-400'
            }`}
          >
            <span className="material-symbols-outlined text-xl">arrow_upward</span>
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-3 font-medium">
          Roxx AI can make mistakes. Check important info.
        </p>
      </footer>
    </motion.div>
  );
};
