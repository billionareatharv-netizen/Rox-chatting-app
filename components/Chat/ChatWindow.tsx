
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Chat, Message, PollData } from '../../types';
import { MessageBubble } from './MessageBubble';
import { aiService } from '../../src/services/aiService';
import { GroupInfoModal } from './GroupInfoModal';
import { MediaViewer } from './MediaViewer';
import { PollModal } from './PollModal';
import { ForwardModal } from './ForwardModal';
import { getAIResponse } from '../../gemini';
import { 
  getUserById, 
  addMessage, 
  getMessages, 
  deleteMessageForEveryone, 
  deleteMessageForMe, 
  togglePinMessage, 
  setTypingStatus,
  editMessage,
  voteInPoll
} from '../../firebase';
import { ROLE_STYLES } from '../../premiumUtils';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  onClose: () => void;
  onUserClick: (user: User) => void;
  onCallStart?: (user: User, type: 'voice' | 'video') => void;
  nicknames: Record<string, string>; 
}

const AI_BOT_ID = "gemini_ai";

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, currentUser, onClose, onUserClick, onCallStart, nicknames }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Voice Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          const recipient = isGroup ? chat.id : otherId!;
          await addMessage({
            id: 'voice_' + Date.now(),
            senderId: currentUser.uid,
            recipientId: recipient,
            text: '🎤 Voice Note',
            type: 'voice',
            timestamp: Date.now(),
            status: 'sent',
            audioUrl: base64,
            duration: recordingDuration
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Microphone access denied or not available");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      audioChunksRef.current = []; // Clear chunks so it doesn't send
    }
  };

  const handlePollCreate = async (question: string, options: string[]) => {
    const recipient = isGroup ? chat.id : otherId!;
    const pollData: PollData = {
      question,
      allowMultiple: false,
      options: options.map(opt => ({ id: Math.random().toString(36).substr(2, 9), text: opt, votes: [] }))
    };
    
    await addMessage({
      id: 'poll_' + Date.now(),
      senderId: currentUser.uid,
      recipientId: recipient,
      text: `📊 Poll: ${question}`,
      type: 'poll',
      timestamp: Date.now(),
      status: 'sent',
      poll: pollData
    });
    setShowPollModal(false);
  };

  const handleEdit = (msg: Message) => {
    setEditingMessage(msg);
    setInputText(msg.text);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !inputText.trim()) return;
    await editMessage(editingMessage.id, inputText.trim());
    setEditingMessage(null);
    setInputText('');
  };

  const handleForward = (msg: Message) => {
    setMessageToForward(msg);
    setShowForwardModal(true);
  };

  const handleVote = async (msgId: string, optId: string) => {
      await voteInPoll(msgId, optId, currentUser.uid);
  };

  const isGroup = chat.type === 'group';
  const otherId = !isGroup ? chat.participants.find(p => p !== currentUser.uid) : null;
  const displayName = isGroup ? chat.name : (otherUser ? (nicknames[otherUser.uid] || otherUser.name) : 'Loading...');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    else setTypingStatus(chat.id, currentUser.uid, true);

    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(chat.id, currentUser.uid, false);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    const sync = async () => {
      const msgs = await getMessages(chat.id, currentUser.role !== 'user');
      setMessages(msgs);
      
      // Suggest smart replies if the last message is from the other user
      if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.senderId !== currentUser.uid) {
              aiService.suggestDMReplies(lastMsg.text).then(setSmartReplies);
          } else {
              setSmartReplies([]);
          }
      }
    };
    sync();
    const itv = setInterval(sync, 2000); 
    return () => clearInterval(itv);
  }, [chat.id]);

  useEffect(() => {
    if (!isGroup && otherId) getUserById(otherId).then(setOtherUser);
  }, [otherId, isGroup]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    if (editingMessage) {
        await handleSaveEdit();
        return;
    }

    setTypingStatus(chat.id, currentUser.uid, false);
    const recipient = isGroup ? chat.id : otherId!;
    
    // AI Content Filtering
    const filterResult = await aiService.filterContent(text);
    if (!filterResult.isSafe) {
        alert(`Message flagged: ${filterResult.reason || "Inappropriate content detected."}. This message will be hidden.`);
        const msg: Message = {
            id: 'm_' + Math.random().toString(36).substring(2, 11),
            senderId: currentUser.uid, 
            recipientId: recipient,
            text, 
            type: 'text', 
            timestamp: Date.now(), 
            status: 'sent',
            isFlagged: true,
            flagReason: filterResult.reason
        };
        setMessages(prev => [...prev, msg]);
        setInputText('');
        setSmartReplies([]);
        await addMessage(msg);
        return;
    }

    const msg: Message = {
      id: 'm_' + Math.random().toString(36).substring(2, 11),
      senderId: currentUser.uid, 
      recipientId: recipient,
      text, 
      type: 'text', 
      timestamp: Date.now(), 
      status: 'sent',
      replyContext: replyingTo ? { messageId: replyingTo.id, text: replyingTo.text || 'Media', senderName: replyingTo.senderId === currentUser.uid ? 'You' : (otherUser?.name || 'User') } : undefined
    };

    setMessages(prev => [...prev, msg]);
    setInputText('');
    setReplyingTo(null);
    setSmartReplies([]);
    await addMessage(msg);
  };

  const handleAIRefine = async () => {
    if (!inputText.trim() || isAIGenerating) return;
    setIsAIGenerating(true);
    try {
        const refined = await aiService.refineText(inputText);
        setInputText(refined);
    } finally {
        setIsAIGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        const recipient = isGroup ? chat.id : otherId!;
        await addMessage({
            id: 'file_' + Date.now(),
            senderId: currentUser.uid,
            recipientId: recipient,
            text: file.name,
            type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file',
            timestamp: Date.now(),
            status: 'sent',
            fileUrl: event.target?.result as string,
            fileName: file.name
        });
    };
    reader.readAsDataURL(file);
  };

  const renderDateSeparator = (timestamp: number, index: number) => {
      const date = new Date(timestamp);
      const prevDate = index > 0 ? new Date(messages[index-1].timestamp) : null;
      if (!prevDate || date.toDateString() !== prevDate.toDateString()) {
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <div className="py-6 flex justify-center w-full" key={`sep-${timestamp}`}>
                <p className="text-[#a19cba]/60 text-[10px] font-black uppercase tracking-[0.2em]">
                    {isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
            </div>
          );
      }
      return null;
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background-dark text-white font-display relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full"></div>
      </div>
      
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-40 header-glass border-b border-white/5">
        <div className="flex items-center p-4 justify-between max-w-2xl mx-auto h-20">
            <div className="flex items-center gap-4">
                <button onClick={onClose} className="flex items-center justify-center size-10 hover:bg-white/5 rounded-full transition-all active:scale-90">
                    <span className="material-symbols-outlined text-white text-2xl">arrow_back_ios_new</span>
                </button>
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => isGroup ? setShowGroupInfo(true) : onUserClick(otherUser!)}>
                    <div className="relative shrink-0">
                        <img 
                            src={isGroup ? (chat.groupIcon || `https://picsum.photos/seed/${chat.id}/200`) : otherUser?.photoURL} 
                            className="aspect-square rounded-2xl size-11 object-cover border border-white/10 group-hover:scale-105 transition-transform" 
                            alt="" 
                        />
                        {!isGroup && otherUser?.status === 'online' && (
                            <div className="absolute -bottom-1 -right-1 size-4 bg-emerald-500 rounded-full border-2 border-background-dark shadow-lg"></div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-white text-base font-black leading-tight tracking-tight truncate max-w-[150px]">{displayName}</h2>
                        <span className="text-[#a19cba] text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
                            {isGroup ? `${chat.participants.length} members` : (otherUser?.status === 'online' ? 'Active Now' : 'Offline')}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {!isGroup && (
                    <>
                        <button onClick={() => onCallStart?.(otherUser!, 'voice')} className="size-11 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition-all active:scale-90 border border-white/5">
                            <span className="material-symbols-outlined text-white text-xl">call</span>
                        </button>
                        <button onClick={() => onCallStart?.(otherUser!, 'video')} className="size-11 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition-all active:scale-90 border border-white/5">
                            <span className="material-symbols-outlined text-white text-xl">videocam</span>
                        </button>
                    </>
                )}
                <button onClick={() => isGroup ? setShowGroupInfo(true) : onUserClick(otherUser!)} className="size-11 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition-all active:scale-90 border border-white/5">
                    <span className="material-symbols-outlined text-white text-xl">more_vert</span>
                </button>
            </div>
        </div>
      </header>

      {/* Messages Area */}
      <main ref={scrollRef} className="flex-1 pt-24 pb-32 px-4 max-w-2xl mx-auto w-full flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
        {messages.map((msg, index) => (
            <React.Fragment key={msg.id}>
                {renderDateSeparator(msg.timestamp, index)}
                <MessageBubble 
                    message={msg} 
                    isOwn={msg.senderId === currentUser.uid} 
                    isAI={msg.senderId === AI_BOT_ID} 
                    onReply={setReplyingTo} 
                    onDelete={(m) => { setMessageToDelete(m); setShowDeleteOptions(true); }}
                    onPin={(m) => togglePinMessage(chat.id, m.id)}
                    onForward={handleForward}
                    onEdit={handleEdit}
                    onVote={handleVote}
                    onMediaClick={setViewingMedia}
                    senderUser={!isGroup ? (msg.senderId === otherId ? otherUser : null) : null}
                    hideAvatar={index > 0 && messages[index-1].senderId === msg.senderId}
                />
            </React.Fragment>
        ))}
      </main>

      {/* Glassmorphism Input Bar */}
      <footer className="fixed bottom-0 w-full z-50 glass pb-10 pt-4 px-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
            {/* AI Smart Replies */}
            {smartReplies.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar py-1">
                    {smartReplies.map((reply, i) => (
                        <button 
                            key={i}
                            onClick={() => setInputText(reply)}
                            className="shrink-0 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[11px] font-bold text-primary whitespace-nowrap active:scale-95 transition-all"
                        >
                            {reply}
                        </button>
                    ))}
                </div>
            )}

            {replyingTo && (
                <div className="flex items-center justify-between bg-white/5 px-4 py-2 rounded-2xl border border-white/5 mb-1 animate-in slide-in-from-bottom-2">
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">Replying to</span>
                        <p className="text-xs text-[#a19cba] truncate">{replyingTo.text || 'Media'}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-[#a19cba]"><span className="material-symbols-outlined text-sm">close</span></button>
                </div>
            )}
            
            {editingMessage && (
                <div className="flex items-center justify-between bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20 mb-1 animate-in slide-in-from-bottom-2">
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">Editing Message</span>
                        <p className="text-xs text-[#a19cba] truncate">{editingMessage.text}</p>
                    </div>
                    <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="text-primary"><span className="material-symbols-outlined text-sm">close</span></button>
                </div>
            )}
            
            <form onSubmit={handleSend} className="flex items-center gap-3">
                <div className="flex items-center gap-1 relative">
                    <button 
                        type="button" 
                        onClick={() => setShowPlusMenu(!showPlusMenu)} 
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${showPlusMenu ? 'bg-primary text-white rotate-45' : 'text-[#a19cba] hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                    </button>
                    
                    {showPlusMenu && (
                        <div className="absolute bottom-full left-0 mb-4 bg-card-dark border border-white/10 p-2 rounded-[2rem] shadow-2xl z-[60] flex flex-col gap-2 min-w-[180px] animate-in slide-in-from-bottom-4">
                            <button 
                                type="button"
                                onClick={() => { setShowPollModal(true); setShowPlusMenu(false); }}
                                className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-3xl transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl">poll</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-widest">Create Poll</span>
                                    <span className="text-[9px] text-[#a19cba] font-bold uppercase tracking-widest">Ask a question</span>
                                </div>
                            </button>
                            <button 
                                type="button"
                                onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
                                className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-3xl transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl">description</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-widest">Document</span>
                                    <span className="text-[9px] text-[#a19cba] font-bold uppercase tracking-widest">Share files</span>
                                </div>
                            </button>
                            <button 
                                type="button"
                                onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
                                className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-3xl transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl">photo_library</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-widest">Gallery</span>
                                    <span className="text-[9px] text-[#a19cba] font-bold uppercase tracking-widest">Photos & Videos</span>
                                </div>
                            </button>
                            <button 
                                type="button"
                                className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-3xl transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-green-500/20 text-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl">location_on</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-widest">Location</span>
                                    <span className="text-[9px] text-[#a19cba] font-bold uppercase tracking-widest">Share your spot</span>
                                </div>
                            </button>
                        </div>
                    )}

                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center rounded-full text-[#a19cba] hover:text-white transition-colors">
                        <span className="material-symbols-outlined">photo_library</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                </div>
                
                <div className="flex-1 relative flex items-center">
                    {isRecording ? (
                        <div className="w-full bg-primary/10 rounded-full py-3 px-5 flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">Recording {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                            </div>
                            <button type="button" onClick={cancelRecording} className="text-red-500 text-[10px] font-black uppercase tracking-widest">Cancel</button>
                        </div>
                    ) : (
                        <div className="w-full relative flex items-center">
                            <input 
                                value={inputText}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border-none rounded-full py-3.5 px-5 pr-12 text-sm focus:ring-1 focus:ring-primary/50 text-white placeholder-[#a19cba]/50 transition-all outline-none" 
                                placeholder="Message..." 
                                type="text"
                            />
                            {inputText.trim() && (
                                <button 
                                    type="button"
                                    onClick={handleAIRefine}
                                    disabled={isAIGenerating}
                                    className="absolute right-10 p-1.5 text-primary hover:bg-primary/10 rounded-full transition-all"
                                    title="AI Refine"
                                >
                                    <span className={`material-symbols-outlined text-lg ${isAIGenerating ? 'animate-spin' : ''}`}>auto_fix_high</span>
                                </button>
                            )}
                            <button type="button" className="absolute right-3 text-[#a19cba] hover:text-white">
                                <span className="material-symbols-outlined text-xl">mood</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {inputText.trim() ? (
                        <button type="submit" className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-white glow-button active:scale-90 transition-all">
                            <span className="material-symbols-outlined fill-1">send</span>
                        </button>
                    ) : (
                        <button 
                            type="button" 
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${isRecording ? 'bg-red-500 scale-125 shadow-lg shadow-red-500/20' : 'bg-white/5 text-[#a19cba] hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${isRecording ? 'text-white' : ''}`}>mic</span>
                        </button>
                    )}
                </div>
            </form>
        </div>
      </footer>

      {showPollModal && (
          <PollModal 
            onClose={() => setShowPollModal(false)} 
            onCreate={handlePollCreate} 
          />
      )}

      {showDeleteOptions && messageToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-card-dark p-8 rounded-[2rem] border border-white/5 w-full max-w-sm text-center shadow-2xl">
                <h3 className="text-lg font-bold mb-4">Delete Message?</h3>
                <div className="flex flex-col gap-3">
                    <button onClick={async () => { await deleteMessageForEveryone(messageToDelete.id); setShowDeleteOptions(false); }} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white transition-all">Delete for Everyone</button>
                    <button onClick={async () => { await deleteMessageForMe(messageToDelete.id, currentUser.uid); setShowDeleteOptions(false); }} className="w-full py-4 bg-white/5 text-white rounded-2xl font-bold uppercase text-xs tracking-widest">Delete for me</button>
                    <button onClick={() => setShowDeleteOptions(false)} className="w-full py-2 text-[#a19cba] text-xs font-bold uppercase mt-2">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {showGroupInfo && <GroupInfoModal chat={chat} currentUser={currentUser} onClose={() => setShowGroupInfo(false)} />}
      {viewingMedia && <MediaViewer message={viewingMedia} currentUser={currentUser} onClose={() => setViewingMedia(null)} onForward={() => {}} onReply={setReplyingTo} />}
      {showForwardModal && messageToForward && (
          <ForwardModal 
            currentUser={currentUser} 
            messageText={messageToForward.text} 
            onClose={() => setShowForwardModal(false)} 
          />
      )}
    </div>
  );
};
