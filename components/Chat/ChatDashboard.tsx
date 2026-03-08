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
import { ConnectionsView } from './ConnectionsView';
import { ReelsView } from './ReelsView';
import { AIChatView } from './AIChatView';
import { initiateCall, subscribeToIncomingCalls, getUserById, updateCallStatus, cleanOldCalls, subscribeToNicknames } from '../../firebase';

interface ChatDashboardProps {
  currentUser: User;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

export type NavTab = 'home' | 'search' | 'reels' | 'add' | 'activity' | 'profile' | 'chats';

import { motion, AnimatePresence } from 'motion/react';

export const ChatDashboard: React.FC<ChatDashboardProps> = ({ currentUser, toggleDarkMode, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [viewingStories, setViewingStories] = useState<Story[] | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [connectionsState, setConnectionsState] = useState<{ user: User, type: 'followers' | 'following' } | null>(null);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [showAIChat, setShowAIChat] = useState(false);

  // Swipe detection
  const handleDragEnd = (event: any, info: any) => {
    // If user drags from left to right significantly
    if (info.offset.x > 150 && Math.abs(info.offset.y) < 50 && !selectedChat && !selectedPost) {
      setShowStoryUpload(true);
    }
  };

  useEffect(() => {
    const unsub = subscribeToNicknames(currentUser.uid, (data) => setNicknames(data));
    return () => unsub();
  }, [currentUser.uid]);

  useEffect(() => {
    // Run cleanup once on mount
    cleanOldCalls();
    
    const unsub = subscribeToIncomingCalls(currentUser.uid, async (incoming) => {
      if (activeCall) return; 
      const caller = await getUserById(incoming.callerId);
      if (caller) {
        setActiveCall({
          id: incoming.id, partner: caller, type: incoming.type, callerId: incoming.callerId,
          receiverId: incoming.receiverId, status: incoming.status, isIncoming: true, timestamp: incoming.timestamp
        });
      }
    });

    return () => unsub();
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
      setConnectionsState(null); // Close connections if opening profile
  };

  const handleMessageUser = (user: User) => {
    const chatId = [currentUser.uid, user.uid].sort().join('_');
    const chat: Chat = {
      id: chatId,
      type: 'private',
      participants: [currentUser.uid, user.uid],
      updatedAt: Date.now()
    };
    setSelectedChat(chat);
    setViewingUser(null);
    setConnectionsState(null);
    setSelectedPost(null);
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
            onOpenAIChat={() => setShowAIChat(true)}
          />
        );
      case 'chats':
        return (
          <Sidebar 
            currentUser={currentUser} 
            onChatSelect={setSelectedChat} 
            onOpenAIChat={() => setShowAIChat(true)}
            activeChatId={selectedChat?.id}
            nicknames={nicknames}
            onBack={() => setActiveTab('home')}
          />
        );
      case 'reels':
        return (
          <ReelsView 
            currentUser={currentUser}
            onOpenProfile={setViewingUser}
            onOpenComments={setSelectedPost}
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
            onOpenPost={setSelectedPost}
            onOpenConnections={(type) => setConnectionsState({ user: currentUser, type })}
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
      <motion.div 
        className="flex-1 relative flex flex-col overflow-hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
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
      </motion.div>

      {/* Global Bottom Navigation */}
      {!selectedChat && !selectedPost && !connectionsState && (
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
      {viewingStories && (
        <StoryViewer 
          stories={viewingStories} 
          currentUser={currentUser} 
          onClose={() => setViewingStories(null)} 
          onSwitchToReels={() => {
            setViewingStories(null);
            setActiveTab('reels');
          }}
        />
      )}
      {viewingUser && (
        <PublicProfile 
          user={viewingUser} 
          currentUser={currentUser}
          onClose={() => setViewingUser(null)} 
          onCallStart={startCall} 
          onMessageClick={handleMessageUser}
          nickname={nicknames[viewingUser.uid]} 
          onOpenPost={setSelectedPost} 
          onOpenConnections={(type) => setConnectionsState({ user: viewingUser, type })}
        />
      )}
      {activeCall && <CallModal session={activeCall} onHangUp={() => setActiveCall(null)} />}
      {selectedPost && <PostDetailView post={selectedPost} currentUser={currentUser} onClose={() => setSelectedPost(null)} onOpenProfile={handleOpenProfileByUid} />}
      {connectionsState && (
        <ConnectionsView 
            targetUser={connectionsState.user} 
            currentUser={currentUser} 
            initialType={connectionsState.type} 
            onClose={() => setConnectionsState(null)}
            onOpenProfile={handleOpenProfileByUid}
        />
      )}
      <AnimatePresence>
        {showAIChat && <AIChatView currentUser={currentUser} onClose={() => setShowAIChat(false)} />}
      </AnimatePresence>
    </div>
  );
};