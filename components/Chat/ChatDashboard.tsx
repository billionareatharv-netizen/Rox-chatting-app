
import React, { useState, useEffect } from 'react';
import { User, Chat, Story, CallSession } from '../../types';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { ProfilePanel } from './ProfilePanel';
import { StoryUpload } from './StoryUpload';
import { StoryViewer } from './StoryViewer';
import { PublicProfile } from './PublicProfile';
import { CallModal } from './CallModal';
import { StatusView } from './StatusView';
import { BottomNav } from './BottomNav';
import { initiateCall, getIncomingCall, getUserById, updateCallStatus, cleanOldCalls } from '../../firebase';

interface ChatDashboardProps {
  currentUser: User;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

export type NavTab = 'chats' | 'status' | 'profile';

export const ChatDashboard: React.FC<ChatDashboardProps> = ({ currentUser, toggleDarkMode, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [viewingStories, setViewingStories] = useState<Story[] | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);

  // Poll for incoming calls
  useEffect(() => {
    const poll = async () => {
      cleanOldCalls();
      if (activeCall) return; 
      
      const incoming = await getIncomingCall(currentUser.uid);
      if (incoming) {
        const caller = await getUserById(incoming.callerId);
        if (caller) {
          setActiveCall({
            id: incoming.id,
            partner: caller,
            type: incoming.type,
            callerId: incoming.callerId,
            receiverId: incoming.receiverId,
            status: incoming.status,
            isIncoming: true,
            timestamp: incoming.timestamp
          });
        }
      }
    };
    
    const itv = setInterval(poll, 3000);
    return () => clearInterval(itv);
  }, [currentUser.uid, activeCall]);

  const startCall = async (user: User, type: 'voice' | 'video') => {
    const call = await initiateCall(currentUser.uid, user.uid, type);
    setActiveCall({ 
      id: call.id,
      partner: user, 
      type, 
      callerId: currentUser.uid,
      receiverId: user.uid,
      status: 'ringing',
      isIncoming: false,
      timestamp: call.timestamp
    });
  };

  const handleCallEnd = async () => {
    if (activeCall) {
      await updateCallStatus(activeCall.id, 'ended');
      setActiveCall(null);
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'status':
        return (
          <StatusView 
            currentUser={currentUser}
            onStoryUpload={() => setShowStoryUpload(true)}
            onStoryView={setViewingStories}
            onChatSelect={(chat) => {
              setSelectedChat(chat);
              setActiveTab('chats');
            }}
          />
        );
      case 'profile':
        return (
          <ProfilePanel 
            user={currentUser} 
            onClose={() => setActiveTab('chats')} 
            toggleDarkMode={toggleDarkMode}
            isDarkMode={isDarkMode}
            isTabMode={true}
          />
        );
      case 'chats':
      default:
        return (
          <Sidebar 
            currentUser={currentUser} 
            onChatSelect={setSelectedChat} 
            activeChatId={selectedChat?.id}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      {/* Sidebar/Main Navigation Area */}
      <div className={`${selectedChat ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 h-full shrink-0 border-r border-slate-200 dark:border-slate-800 shadow-xl z-20 flex-col bg-white dark:bg-slate-900`}>
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderActiveView()}
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Chat Area */}
      <div className={`${!selectedChat ? 'hidden lg:flex' : 'flex'} flex-1 h-full relative overflow-hidden bg-slate-100/30 dark:bg-slate-900/40`}>
        {selectedChat ? (
          <ChatWindow 
            chat={selectedChat} 
            currentUser={currentUser} 
            onClose={() => setSelectedChat(null)}
            onUserClick={setViewingUser}
            onCallStart={startCall}
          />
        ) : (
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-8 text-center h-full relative">
            <div className="absolute inset-0 opacity-5 dark:opacity-[0.02] pointer-events-none overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,0 L100,100 M100,0 L0,100" stroke="currentColor" strokeWidth="0.1" fill="none" />
                </svg>
            </div>
            <div className="w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full flex items-center justify-center mb-8 animate-float">
              <svg className="w-16 h-16 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Connect instantly.</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm text-lg font-medium leading-relaxed">
              Select a conversation to start chatting, or explore recent stories from your contacts.
            </p>
          </div>
        )}
      </div>

      {/* Overlays */}
      {showStoryUpload && (
        <StoryUpload 
          currentUser={currentUser} 
          onClose={() => setShowStoryUpload(false)} 
        />
      )}

      {viewingStories && (
        <StoryViewer 
          stories={viewingStories} 
          currentUser={currentUser}
          onClose={() => setViewingStories(null)} 
        />
      )}

      {viewingUser && (
        <PublicProfile 
          user={viewingUser} 
          onClose={() => setViewingUser(null)} 
          onCallStart={startCall}
        />
      )}

      {activeCall && (
        <CallModal 
          session={activeCall}
          onHangUp={handleCallEnd} 
        />
      )}
    </div>
  );
};
