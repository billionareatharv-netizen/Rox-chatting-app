
export interface User {
  uid: string;
  name: string;
  username?: string; // Feature: Username
  email: string;
  photoURL: string;
  status: 'online' | 'offline';
  lastSeen: number;
  bio?: string;
  blockedUsers?: string[];
  pinnedChats?: string[]; 
  chatLockPassword?: string; 
  isAdmin?: boolean; 
  isGloballyBlocked?: boolean;
  privacySettings?: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
  };
  security?: {
    appLockPin?: string; 
    biometricsEnabled?: boolean;
  };
}

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'story_reply' | 'note_reply' | 'deleted' | 'poll' | 'sticker' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'seen';

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; 
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string; 
  text: string;
  type: MessageType;
  timestamp: number;
  status: MessageStatus;
  fileUrl?: string;
  fileName?: string;
  audioUrl?: string; 
  duration?: number; 
  isForwarded?: boolean;
  isEdited?: boolean;
  isPinned?: boolean; 
  deletedFor?: string[]; 
  replyContext?: {
    messageId: string;
    text: string;
    senderName: string;
  };
  storyContext?: {
    storyId: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
  };
  noteContext?: {
    noteId: string;
    text: string;
    userPhoto: string;
  };
  reactions?: { [emoji: string]: string[] }; 
  poll?: PollData;
  stickerUrl?: string;
  visibleTo?: string[]; 
}

export interface StoryView {
  userId: string;
  userName: string;
  timestamp: number;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  timestamp: number;
  likes?: string[]; 
  views?: StoryView[];
}

export interface Note {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  timestamp: number;
}

export interface SavedMedia {
  id: string;
  userId: string; 
  mediaUrl: string;
  mediaType: 'image' | 'video';
  savedAt: number;
  originalSenderName: string;
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  participants: string[];
  name?: string; 
  description?: string;
  groupIcon?: string; 
  adminIds?: string[]; 
  pinnedMessages?: string[]; 
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  updatedAt: number;
  typing?: { [uid: string]: boolean };
  lockedBy?: string[]; 
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended';

export interface CallSession {
  id: string;
  type: CallType;
  callerId: string;
  receiverId: string;
  status: CallStatus;
  partner: User;
  isIncoming: boolean;
  timestamp: number;
  offer?: any;
  answer?: any;
  callerCandidates?: any[];
  calleeCandidates?: any[];
}
