// =========================
// ChatWindow.tsx (FIXED)
// =========================

import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message, PollData } from '../../types';
import { MessageBubble } from './MessageBubble';
import { GroupInfoModal } from './GroupInfoModal';
import { MediaViewer } from './MediaViewer';
import { getAIResponse } from '../../gemini';
import {
  getUserById,
  addMessage,
  getMessages,
  toggleChatLock,
  editMessage,
  deleteMessageForEveryone,
  deleteMessageForMe,
  subscribeToChat,
  subscribeToUser,
  togglePinMessage,
  setTypingStatus,
  getMyChats,
  getAllUsers
} from '../../firebase';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  onClose: () => void;
  onUserClick: (user: User) => void;
  onCallStart?: (user: User, type: 'voice' | 'video') => void;
}

const STICKERS = [
  'https://cdn-icons-png.flaticon.com/512/742/742751.png',
  'https://cdn-icons-png.flaticon.com/512/742/742752.png',
  'https://cdn-icons-png.flaticon.com/512/742/742923.png',
  'https://cdn-icons-png.flaticon.com/512/742/742823.png',
];

const ACCEPTED_MEDIA = "image/png,image/jpeg,image/gif,video/mp4,video/webm";
const BG_PATTERN = "https://www.transparenttextures.com/patterns/asfalt-dark.png";
const AI_CMD = "/ai";
const AI_BOT_ID = "gemini_ai";

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  currentUser,
  onClose,
  onUserClick,
  onCallStart
}) => {

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<Message | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const isGroup = chat.type === 'group';
  const participants = chat.participants || [];
  const otherId = !isGroup
    ? participants.find(p => p !== currentUser.uid)
    : null;

  // --------------------
  // Effects
  // --------------------
  useEffect(() => {
    const unsub = subscribeToChat(chat.id, (data) => {
      if (data.typing) {
        const t = Object.entries(data.typing)
          .filter(([uid, v]) => uid !== currentUser.uid && v)
          .map(([uid]) => uid);
        setTypingUsers(t);
      } else {
        setTypingUsers([]);
      }
    });
    return () => unsub();
  }, [chat.id, currentUser.uid]);

  useEffect(() => {
    if (!otherId || isGroup) return;
    getUserById(otherId).then(setOtherUser);
    const unsub = subscribeToUser(otherId, setOtherUser);
    return () => unsub();
  }, [otherId, isGroup]);

  useEffect(() => {
    getMessages(chat.id).then(setMessages);
  }, [chat.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages.length, typingUsers.length]);

  // --------------------
  // Send Message
  // --------------------
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const msg: Message = {
      id: 'm_' + Math.random().toString(36).slice(2),
      senderId: currentUser.uid,
      recipientId: isGroup ? chat.id : otherId!,
      text,
      type: 'text',
      timestamp: Date.now(),
      status: 'sent'
    };

    setMessages(prev => [...prev, msg]);
    setInputText('');
    await addMessage(msg);

    if (text.startsWith(AI_CMD)) {
      try {
        const res = await getAIResponse(text.replace(AI_CMD, '').trim());
        await addMessage({
          id: 'ai_' + Date.now(),
          senderId: AI_BOT_ID,
          recipientId: chat.id,
          text: res,
          type: 'text',
          timestamp: Date.now(),
          status: 'seen'
        });
      } catch {}
    }
  };

  // --------------------
  // JSX
  // --------------------
  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-slate-900">

        {/* HEADER */}
        <div className="p-4 border-b flex justify-between items-center">
          <button onClick={onClose}>←</button>
          <h3 className="font-bold">
            {isGroup ? chat.name : otherUser?.name || 'Chat'}
          </h3>
          <button onClick={() => setShowGroupInfo(true)}>ℹ️</button>
        </div>

        {/* MESSAGES */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map(m => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.senderId === currentUser.uid}
              isAI={m.senderId === AI_BOT_ID}
              onMediaClick={setViewingMedia}
            />
          ))}

          {typingUsers.length > 0 && (
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
            </div>
          )}
        </div>

        {/* INPUT */}
        <form onSubmit={handleSend} className="p-4 flex gap-2 border-t">
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="flex-1 border rounded px-4 py-2"
            placeholder="Type a message…"
          />
          <button type="submit" className="px-4 py-2 bg-indigo-500 text-white rounded">
            Send
          </button>
        </form>
      </div>

      {showGroupInfo && (
        <GroupInfoModal
          chat={chat}
          currentUser={currentUser}
          onClose={() => setShowGroupInfo(false)}
        />
      )}

      {viewingMedia && (
        <MediaViewer
          message={viewingMedia}
          currentUser={currentUser}
          onClose={() => setViewingMedia(null)}
          onForward={() => {}}
          onReply={() => {}}
        />
      )}
    </>
  );
};
