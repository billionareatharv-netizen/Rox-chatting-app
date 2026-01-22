
export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  status: 'online' | 'offline';
  lastSeen: number;
  bio?: string;
  blockedUsers?: string[];
  pinnedChats?: string[]; // Chat IDs pinned by user
  chatLockPassword?: string; 
  isAdmin?: boolean; 
  isGloballyBlocked?: boolean;
}

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'story_reply' | 'deleted';
export type MessageStatus = 'sent' | 'delivered' | 'seen';

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
  isPinned?: boolean; // Visual helper
  deletedFor?: string[]; // New: IDs of users who deleted this for themselves
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
  userId: string; // The user who saved it
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
  groupIcon?: string; 
  adminIds?: string[]; 
  pinnedMessages?: string[]; // New: IDs of pinned messages in this chat
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
  // WebRTC Signaling Data
  offer?: any;
  answer?: any;
  callerCandidates?: any[];
  calleeCandidates?: any[];
}