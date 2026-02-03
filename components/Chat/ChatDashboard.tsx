
import React, { useState, useEffect } from 'react';
import { User, Chat, Story, CallSession } from '../../types';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { ProfilePanel } from './ProfilePanel';
import { StoryUpload } from './StoryUpload';
import { StoryViewer } from './StoryViewer';
import { PublicProfile } from './PublicProfile';
import { CallModal } from './CallModal';
import { HomeFeed } from './HomeFeed';
import { BottomNav } from './BottomNav';
import { initiateCall, getIncomingCall, getUserById, updateCallStatus, cleanOldCalls, subscribeToNicknames } from '../../firebase';

interface ChatDashboardProps {
  currentUser: User;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

export type NavTab = 'home' | 'search' | 'add' | 'reels' | 'profile' | 'chats';

export const ChatDashboard: React.FC<ChatDashboardProps> = ({ currentUser, toggleDarkMode, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [viewingStories, setViewingStories] = useState<Story[] | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = subscribeToNicknames(currentUser.uid, (data) => setNicknames(data));
    return () => unsub();
  }, [currentUser.uid]);

  useEffect(() => {
    const poll = async () => {
      cleanOldCalls();
      if (activeCall) return; 
      const incoming = await getIncomingCall(currentUser.uid);
      if (incoming) {
        const caller = await getUserById(incoming.callerId);
        if (caller) {
          setActiveCall({
            id: incoming.id, partner: caller, type: incoming.type, callerId: incoming.callerId,
            receiverId: incoming.receiverId, status: incoming.status, isIncoming: true, timestamp: incoming.timestamp
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
      id: call.id, partner: user, type, callerId: currentUser.uid, receiverId: user.uid,
      status: 'ringing', isIncoming: false, timestamp: call.timestamp
    });
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'chats':
        return (
            <Sidebar 
                currentUser={currentUser} 
                onChatSelect={setSelectedChat} 
                activeChatId={selectedChat?.id}
                nicknames={nicknames}
            />
        );
      case 'profile':
        return (
          <ProfilePanel 
            user={currentUser} 
            onClose={() => setActiveTab('home')} 
            toggleDarkMode={toggleDarkMode}
            isDarkMode={isDarkMode}
            isTabMode={true}
          />
        );
      case 'home':
      default:
        return (
          <HomeFeed 
            currentUser={currentUser}
            onOpenDMs={() => setActiveTab('chats')}
            onUploadPost={() => setShowStoryUpload(true)}
            onOpenStory={setViewingStories}
          />
        );
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-background-light dark:bg-background-dark transition-colors duration-300 overflow-hidden font-display">
      {/* Desktop/Wide Chat Sidebar (Optional behavior) */}
      <div className={`${(selectedChat || activeTab === 'chats') ? 'flex' : 'hidden lg:flex'} w-full lg:w-96 h-full shrink-0 border-r border-slate-200 dark:border-slate-800 z-20 flex-col bg-white dark:bg-card-dark`}>
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {renderActiveView()}
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} currentUser={currentUser} />
      </div>

      {/* Main Area (Post Feed or Active Chat) */}
      <div className={`${(!selectedChat && activeTab !== 'chats') ? 'flex' : 'hidden lg:flex'} flex-1 h-full relative overflow-hidden bg-slate-100/30 dark:bg-slate-900/40`}>
        {selectedChat ? (
          <ChatWindow 
            chat={selectedChat} 
            currentUser={currentUser} 
            onClose={() => setSelectedChat(null)}
            onUserClick={setViewingUser}
            onCallStart={startCall}
            nicknames={nicknames}
          />
        ) : (
          <div className="w-full h-full">
            {activeTab !== 'chats' && <HomeFeed currentUser={currentUser} onOpenDMs={() => setActiveTab('chats')} onUploadPost={() => setShowStoryUpload(true)} onOpenStory={setViewingStories} />}
          </div>
        )}
      </div>

      {showStoryUpload && <StoryUpload currentUser={currentUser} onClose={() => setShowStoryUpload(false)} />}
      {viewingStories && <StoryViewer stories={viewingStories} currentUser={currentUser} onClose={() => setViewingStories(null)} />}
      {viewingUser && <PublicProfile user={viewingUser} onClose={() => setViewingUser(null)} onCallStart={startCall} nickname={nicknames[viewingUser.uid]} />}
      {activeCall && <CallModal session={activeCall} onHangUp={() => setActiveCall(null)} />}
    </div>
  );
};
