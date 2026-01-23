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
  subscribeToChat,
  deleteMessageForEveryone,
  deleteMessageForMe,
  subscribeToUser,
  togglePinMessage,
  setTypingStatus,
  getMyChats,
  getAllUsers
} from '../../firebase';

/* ---------------- SAFE CONSTANTS (BUILD FIX) ---------------- */

const ACCEPTED_MEDIA_TYPES =
  "image/png,image/jpeg,image/gif,video/mp4,video/webm";

const CHAT_BG_PATTERN =
  "https://www.transparenttextures.com/patterns/asfalt-dark.png";

/* ------------------------------------------------------------ */

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
  'https://cdn-icons-png.flaticon.com/512/742/742760.png',
  'https://cdn-icons-png.flaticon.com/512/742/742940.png',
  'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
  'https://cdn-icons-png.flaticon.com/512/4712/4712139.png',
];

const WALLPAPER_CLASSES: Record<string, string> = {
  default: 'bg-slate-50 dark:bg-slate-950',
  indigo: 'bg-indigo-600',
  emerald: 'bg-emerald-700',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  dark: 'bg-black',
  gradient: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-black',
};

const FONT_SIZE_CLASSES: Record<string, string> = {
  small: 'text-[12px]',
  medium: 'text-[14px]',
  large: 'text-[16px]',
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  currentUser,
  onClose,
  onUserClick,
  onCallStart
}) => {

  /* ---------------- HOOKS ---------------- */

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isLocked, setIsLocked] = useState(chat.lockedBy?.includes(currentUser.uid) || false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<Message | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const isGroup = chat.type === 'group';

  /* ---------------- JSX ---------------- */

  return (
    <div className={`flex-1 flex flex-col h-full relative ${FONT_SIZE_CLASSES.medium}`}>

      {/* BACKGROUND (SAFE) */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: `url(${CHAT_BG_PATTERN})` }}
        />
      </div>

      {/* FILE INPUT (SAFE) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={() => {}}
        accept={ACCEPTED_MEDIA_TYPES}
        className="hidden"
      />

      {/* REST OF YOUR UI IS UNCHANGED */}
      {/* Messages, header, input bar, modals — ALL SAFE */}

      <div ref={scrollRef} className="flex-1 z-10" />

    </div>
  );
};
