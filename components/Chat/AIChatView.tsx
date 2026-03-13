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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`ai_chat_${currentUser.uid}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load AI chat history", e);
      }
    } else {
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
      localStorage.setItem(`ai_chat_${currentUser.uid}`, JSON.stringify(messages.slice(-20)));
    }
    scrollToBottom();
  }, [messages, currentUser.uid]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!overrideInput) setInput('');
    setIsTyping(true);

    try {
      const client = new OpenAI({
        baseURL: "https://aimodelapi.onrender.com/v1",
        apiKey: "devx-5xc0eda8tc5rcjgvuo0kxio4wncq1o1v",
        dangerouslyAllowBrowser: true
      });

      const modelId = MODELS[selectedModel];
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const regenerateLast = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSend(lastUserMsg.content);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[200] bg-white dark:bg-[#0f0f0f] flex flex-col"
    >
      {/* Header */}
      <header className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 active:scale-90 transition-all">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tighter">ROXX AI</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Online</p>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as any)}
            className="bg-slate-100 dark:bg-white/5 border-none rounded-xl text-[9px] font-black uppercase tracking-widest px-3 py-2 pr-8 appearance-none cursor-pointer focus:ring-2 focus:ring-primary transition-all"
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
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar"
      >
        <div className="max-w-3xl mx-auto space-y-6 pb-10">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-[10px] shadow-sm ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-primary'}`}>
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className={`group relative flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-500 text-white rounded-tr-none' 
                        : 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-slate-100 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                    
                    {/* Message Actions */}
                    <div className={`flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <button 
                        onClick={() => copyToClipboard(msg.content)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-primary transition-colors"
                        title="Copy"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                      {msg.role === 'assistant' && idx === messages.length - 1 && (
                        <button 
                          onClick={regenerateLast}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-primary transition-colors"
                          title="Regenerate"
                        >
                          <span className="material-symbols-outlined text-sm">refresh</span>
                        </button>
                      )}
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-30 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="shrink-0 w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-[10px]">
                AI
              </div>
              <div className="bg-slate-100 dark:bg-white/5 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-duration:0.8s]"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]"></div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <footer className="p-4 md:p-8 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 bg-slate-100 dark:bg-white/5 rounded-[2rem] p-2 border border-transparent focus-within:border-primary/30 transition-all">
            <button className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-xl">smart_toy</span>
            </button>
            <textarea 
              ref={textareaRef}
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
              className="flex-1 bg-transparent border-none outline-none py-2.5 px-2 text-[14px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none max-h-[200px]"
            />
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all ${
                input.trim() && !isTyping ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-200 dark:bg-white/10 text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-xl">arrow_upward</span>
            </button>
          </div>
          <p className="text-center text-[9px] text-slate-400 dark:text-slate-600 mt-3 font-bold uppercase tracking-widest">
            Roxx AI can make mistakes. Check important info.
          </p>
        </div>
      </footer>
    </motion.div>
  );
};
