
import React, { useState, useEffect } from 'react';
import { User, Chat, Story, CallSession, Post } from '../../types';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { ProfilePanel } from './ProfilePanel';
import { StoryUpload } from './StoryUpload';
import { StoryViewer } from './StoryViewer';
import { PublicProfile } from './PublicProfile';
import { CallModal } from './CallModal';
import { HomeFeed } from './HomeFeed';
import { BottomNav } from './BottomNav';
import { ExploreView } from './ExploreView';
import { ActivityView } from './ActivityView';
import { PostDetailView } from './PostDetailView';
import { initiateCall, getIncomingCall, getUserById, updateCallStatus, cleanOldCalls, subscribeToNicknames } from '../../firebase';

interface ChatDashboardProps {
  currentUser: User;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

export type NavTab = 'home' | 'search' | 'add' | 'activity' | 'profile' | 'chats';

export const ChatDashboard: React.FC<ChatDashboardProps> = ({ currentUser, toggleDarkMode, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [viewingStories, setViewingStories] = useState<Story[] | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
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

  const handleOpenProfileByUid = async (uid: string) => {
      const user = await getUserById(uid);
      if(user) setViewingUser(user);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeFeed 
            currentUser={currentUser}
            onOpenDMs={() => setActiveTab('chats')}
            onUploadPost={() => setShowStoryUpload(true)}
            onOpenStory={setViewingStories}
            onOpenPost={setSelectedPost}
          />
        );
      case 'chats':
        return (
          <Sidebar 
            currentUser={currentUser} 
            onChatSelect={setSelectedChat} 
            activeChatId={selectedChat?.id}
            nicknames={nicknames}
            onBack={() => setActiveTab('home')}
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
      case 'search':
        return (
          <ExploreView 
            currentUser={currentUser}
            onOpenProfile={setViewingUser}
            onOpenPost={setSelectedPost}
          />
        );
      case 'activity':
        return (
          <ActivityView 
            onBack={() => setActiveTab('home')}
            onOpenProfile={setViewingUser}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background-light dark:bg-background-dark overflow-hidden font-display">
      
      {/* Top Main Content Area */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
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
          renderTabContent()
        )}
      </div>

      {/* Global Bottom Navigation */}
      {!selectedChat && !selectedPost && (
        <BottomNav 
          activeTab={activeTab} 
          onTabChange={(tab) => {
            if (tab === 'add') setShowStoryUpload(true);
            else setActiveTab(tab);
          }} 
          currentUser={currentUser} 
        />
      )}

      {/* Modals & Overlays */}
      {showStoryUpload && <StoryUpload currentUser={currentUser} onClose={() => setShowStoryUpload(false)} />}
      {viewingStories && <StoryViewer stories={viewingStories} currentUser={currentUser} onClose={() => setViewingStories(null)} />}
      {viewingUser && <PublicProfile user={viewingUser} onClose={() => setViewingUser(null)} onCallStart={startCall} nickname={nicknames[viewingUser.uid]} />}
      {activeCall && <CallModal session={activeCall} onHangUp={() => setActiveCall(null)} />}
      {selectedPost && <PostDetailView post={selectedPost} currentUser={currentUser} onClose={() => setSelectedPost(null)} onOpenProfile={handleOpenProfileByUid} />}
    </div>
  );
};
