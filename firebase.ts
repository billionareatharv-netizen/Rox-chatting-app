
/**
 * MOCK FIREBASE IMPLEMENTATION
 */

const STORAGE_KEY_USERS = 'gemini_chat_db_users';
const STORAGE_KEY_SESSION = 'chat_session';
const STORAGE_KEY_STORIES = 'gemini_chat_db_stories';
const STORAGE_KEY_MESSAGES = 'gemini_chat_db_messages';
const STORAGE_KEY_CHATS = 'gemini_chat_db_chats';
const STORAGE_KEY_CALLS = 'gemini_chat_db_calls';

const getLocal = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError')) {
      const messages = getLocal(STORAGE_KEY_MESSAGES);
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages.slice(-20)));
      localStorage.setItem(key, JSON.stringify(data));
    } else {
      throw e;
    }
  }
};

const seedMockData = () => {
  const users = getLocal(STORAGE_KEY_USERS);
  
  if (!users.some((u: any) => u.email === 'demo@example.com')) {
    users.push({ 
      uid: 'demo-user-123', 
      email: 'demo@example.com', 
      password: 'password123', 
      name: 'Demo User',
      photoURL: 'https://picsum.photos/seed/demo/200',
      status: 'offline', 
      lastSeen: Date.now(),
      bio: 'I am the default ROXX CHATS demo user.',
      blockedUsers: [], 
      lockedChats: [], 
      chatLockPassword: '1234'
    });
  }

  if (!users.some((u: any) => u.email === 'betterrroxx@gmail.com')) {
    users.push({ 
      uid: 'admin-001', 
      email: 'betterrroxx@gmail.com', 
      password: 'wanted9090', 
      name: 'Super Admin',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
      status: 'offline', 
      lastSeen: Date.now(),
      bio: 'System Administrator',
      isAdmin: true,
      blockedUsers: [], 
      lockedChats: [], 
      chatLockPassword: '9090'
    });
  }

  saveLocal(STORAGE_KEY_USERS, users);
};

seedMockData();

let authListeners: Array<(user: any) => void> = [];

const notifyAuthListeners = (user: any) => {
  auth.currentUser = user;
  authListeners.forEach(cb => cb(user));
};

export const auth: any = {
  currentUser: null,
  onAuthStateChanged: (callback: (user: any) => void) => {
    authListeners.push(callback);
    const saved = localStorage.getItem(STORAGE_KEY_SESSION);
    if (saved) {
      try {
        const user = JSON.parse(saved);
        auth.currentUser = user;
        callback(user);
      } catch (e) {
        callback(null);
      }
    } else {
      callback(null);
    }
    return () => { authListeners = authListeners.filter(l => l !== callback); };
  }
};

export const db: any = { collection: (name: string) => ({ name }) };

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const users = getLocal(STORAGE_KEY_USERS);
  const user = users.find((u: any) => u.email === email);
  
  if (!user) throw new Error("auth/user-not-found");
  if (user.password !== pass) throw new Error("auth/wrong-password");
  if (user.isGloballyBlocked) throw new Error("This account has been suspended by an administrator.");
  
  user.status = 'online';
  user.lastSeen = Date.now();
  saveLocal(STORAGE_KEY_USERS, users);
  
  const { password, ...userProfile } = user;
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
  notifyAuthListeners(userProfile);
  return { user: userProfile };
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const users = getLocal(STORAGE_KEY_USERS);
  if (users.some((u: any) => u.email === email)) throw new Error("auth/email-already-in-use");

  const newUser = { 
    uid: crypto.randomUUID(), 
    email, 
    password: pass, 
    status: 'online', 
    lastSeen: Date.now(),
    photoURL: `https://picsum.photos/seed/${Math.random()}/200`,
    name: email.split('@')[0], 
    blockedUsers: [], 
    lockedChats: [], 
    chatLockPassword: ''
  };
  
  users.push(newUser);
  saveLocal(STORAGE_KEY_USERS, users);
  
  const { password, ...userProfile } = newUser;
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
  notifyAuthListeners(userProfile);
  return { user: userProfile };
};

export const signInWithPopup = async () => {
  const users = getLocal(STORAGE_KEY_USERS);
  let user = users.find((u: any) => u.email === 'google-user@example.com');
  
  if (!user) {
    user = {
      uid: 'google_' + crypto.randomUUID(),
      email: 'google-user@example.com',
      status: 'online',
      lastSeen: Date.now(),
      photoURL: `https://picsum.photos/seed/google/200`,
      name: 'Google Explorer',
      blockedUsers: [],
      lockedChats: [],
      chatLockPassword: ''
    };
    users.push(user);
    saveLocal(STORAGE_KEY_USERS, users);
  }
  
  const { password, ...userProfile } = user;
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(userProfile));
  notifyAuthListeners(userProfile);
  return { user: userProfile };
};

export const signOut = async () => {
  if (auth.currentUser) {
    const users = getLocal(STORAGE_KEY_USERS);
    const i = users.findIndex((u: any) => u.uid === auth.currentUser.uid);
    if (i !== -1) {
      users[i].status = 'offline';
      users[i].lastSeen = Date.now();
      saveLocal(STORAGE_KEY_USERS, users);
    }
  }
  localStorage.removeItem(STORAGE_KEY_SESSION);
  notifyAuthListeners(null);
};

export const updateProfile = async (user: any, updates: any) => {
  const users = getLocal(STORAGE_KEY_USERS);
  const targetUid = user.uid || user.id;
  const idx = users.findIndex((u: any) => u.uid === targetUid);
  
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    saveLocal(STORAGE_KEY_USERS, users);
    const updated = { ...users[idx] };
    delete updated.password;
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));
    notifyAuthListeners(updated);
    return updated;
  }
  throw new Error("User not found");
};

// --- ADMIN FUNCTIONS ---

export const admin_getAllUsers = async () => getLocal(STORAGE_KEY_USERS);

export const admin_toggleAdminAccess = async (uid: string) => {
  const users = getLocal(STORAGE_KEY_USERS);
  const i = users.findIndex((u: any) => u.uid === uid);
  if (i !== -1) {
    // Prevent self-demotion or demoting the super admin via standard panel
    if (users[i].email === 'betterrroxx@gmail.com') return;
    users[i].isAdmin = !users[i].isAdmin;
    saveLocal(STORAGE_KEY_USERS, users);
  }
};

export const admin_toggleGlobalBlock = async (uid: string) => {
  const users = getLocal(STORAGE_KEY_USERS);
  const i = users.findIndex((u: any) => u.uid === uid);
  if (i !== -1) {
    if (users[i].isAdmin) return; 
    users[i].isGloballyBlocked = !users[i].isGloballyBlocked;
    if (users[i].isGloballyBlocked) users[i].status = 'offline';
    saveLocal(STORAGE_KEY_USERS, users);
  }
};

export const admin_deleteUser = async (uid: string) => {
  const users = getLocal(STORAGE_KEY_USERS).filter((u: any) => u.uid !== uid || u.isAdmin);
  saveLocal(STORAGE_KEY_USERS, users);
  
  const messages = getLocal(STORAGE_KEY_MESSAGES).filter((m: any) => m.senderId !== uid && m.recipientId !== uid);
  saveLocal(STORAGE_KEY_MESSAGES, messages);
  
  const chats = getLocal(STORAGE_KEY_CHATS).filter((c: any) => !c.participants.includes(uid));
  saveLocal(STORAGE_KEY_CHATS, chats);
};

export const admin_getStats = async () => {
  return {
    users: getLocal(STORAGE_KEY_USERS).length,
    messages: getLocal(STORAGE_KEY_MESSAGES).length,
    chats: getLocal(STORAGE_KEY_CHATS).length,
    stories: getLocal(STORAGE_KEY_STORIES).length
  };
};

// --- MESSAGING ---

export const createGroup = async (name: string, participants: string[], adminId: string) => {
  const chats = getLocal(STORAGE_KEY_CHATS);
  const newGroup = {
    id: 'group_' + crypto.randomUUID(),
    type: 'group',
    name,
    participants: [...participants, adminId],
    adminIds: [adminId],
    updatedAt: Date.now(),
    lockedBy: []
  };
  chats.push(newGroup);
  saveLocal(STORAGE_KEY_CHATS, chats);
  return newGroup;
};

export const toggleChatLock = async (chatId: string, userId: string) => {
  const chats = getLocal(STORAGE_KEY_CHATS);
  const chatIdx = chats.findIndex((c: any) => c.id === chatId);
  if (chatIdx !== -1) {
    const lockedBy = chats[chatIdx].lockedBy || [];
    const idx = lockedBy.indexOf(userId);
    if (idx === -1) lockedBy.push(userId);
    else lockedBy.splice(idx, 1);
    chats[chatIdx].lockedBy = lockedBy;
    saveLocal(STORAGE_KEY_CHATS, chats);
  }
};

export const addMessage = async (msg: any) => {
  const messages = getLocal(STORAGE_KEY_MESSAGES);
  messages.push(msg);
  saveLocal(STORAGE_KEY_MESSAGES, messages.slice(-500));

  const chats = getLocal(STORAGE_KEY_CHATS);
  const chatId = msg.recipientId.startsWith('group_') 
    ? msg.recipientId 
    : [msg.senderId, msg.recipientId].sort().join('_');
  
  const chatIdx = chats.findIndex((c: any) => c.id === chatId);
  const update = {
    lastMessage: { text: msg.text, senderId: msg.senderId, timestamp: msg.timestamp },
    updatedAt: msg.timestamp
  };

  if (chatIdx !== -1) {
    chats[chatIdx] = { ...chats[chatIdx], ...update };
  } else {
    chats.push({
      id: chatId, type: 'private', 
      participants: [msg.senderId, msg.recipientId], 
      ...update, lockedBy: []
    });
  }
  saveLocal(STORAGE_KEY_CHATS, chats);
};

export const markMessagesAsDelivered = async (chatId: string, userId: string) => {
  const messages = getLocal(STORAGE_KEY_MESSAGES);
  let changed = false;
  messages.forEach((m: any) => {
    if (m.recipientId === userId && m.status === 'sent') {
      m.status = 'delivered';
      changed = true;
    }
    if (chatId.startsWith('group_') && m.recipientId === chatId && m.senderId !== userId && m.status === 'sent') {
        m.status = 'delivered';
        changed = true;
    }
  });
  if (changed) saveLocal(STORAGE_KEY_MESSAGES, messages);
};

export const markMessagesAsSeen = async (chatId: string, userId: string) => {
    const messages = getLocal(STORAGE_KEY_MESSAGES);
    let changed = false;
    messages.forEach((m: any) => {
      if (!chatId.startsWith('group_')) {
          const [u1, u2] = chatId.split('_');
          const isParticipant = (m.senderId === u1 && m.recipientId === u2) || (m.senderId === u2 && m.recipientId === u1);
          if (isParticipant && m.recipientId === userId && m.status !== 'seen') {
            m.status = 'seen';
            changed = true;
          }
      } else {
          if (m.recipientId === chatId && m.senderId !== userId && m.status !== 'seen') {
            m.status = 'seen';
            changed = true;
          }
      }
    });
    if (changed) saveLocal(STORAGE_KEY_MESSAGES, messages);
  };

export const getMessages = async (chatId: string) => {
  const all = getLocal(STORAGE_KEY_MESSAGES);
  if (chatId.startsWith('group_')) {
    return all.filter((m: any) => m.recipientId === chatId);
  }
  const [u1, u2] = chatId.split('_');
  return all.filter((m: any) => 
    (m.senderId === u1 && m.recipientId === u2) || (m.senderId === u2 && m.recipientId === u1)
  );
};

export const getMyChats = async (uid: string) => {
  const chats = getLocal(STORAGE_KEY_CHATS);
  return chats.filter((c: any) => c.participants.includes(uid))
              .sort((a: any, b: any) => b.updatedAt - a.updatedAt);
};

export const getAllUsers = async () => getLocal(STORAGE_KEY_USERS).filter((u: any) => !u.isGloballyBlocked);
export const getUserById = async (uid: string) => getLocal(STORAGE_KEY_USERS).find((u: any) => u.uid === uid);

export const initiateCall = async (callerId: string, receiverId: string, type: 'voice' | 'video') => {
  const calls = getLocal(STORAGE_KEY_CALLS);
  const callId = 'call_' + crypto.randomUUID();
  const newCall = {
    id: callId,
    callerId,
    receiverId,
    type,
    status: 'ringing',
    timestamp: Date.now()
  };
  calls.push(newCall);
  saveLocal(STORAGE_KEY_CALLS, calls);
  return newCall;
};

export const getIncomingCall = async (userId: string) => {
  const calls = getLocal(STORAGE_KEY_CALLS);
  return calls.find((c: any) => c.receiverId === userId && c.status === 'ringing' && (Date.now() - c.timestamp) < 60000);
};

export const updateCallStatus = async (callId: string, status: 'accepted' | 'rejected' | 'ended') => {
  const calls = getLocal(STORAGE_KEY_CALLS);
  const idx = calls.findIndex((c: any) => c.id === callId);
  if (idx !== -1) {
    calls[idx].status = status;
    saveLocal(STORAGE_KEY_CALLS, calls);
    return calls[idx];
  }
  return null;
};

export const getCallById = async (callId: string) => {
  const calls = getLocal(STORAGE_KEY_CALLS);
  return calls.find((c: any) => c.id === callId);
};

export const cleanOldCalls = () => {
  const calls = getLocal(STORAGE_KEY_CALLS);
  const filtered = calls.filter((c: any) => (Date.now() - c.timestamp) < 300000);
  if (filtered.length !== calls.length) {
    saveLocal(STORAGE_KEY_CALLS, filtered);
  }
};

export const addStory = async (story: any) => {
  const s = getLocal(STORAGE_KEY_STORIES);
  s.push({ ...story, likes: [], views: [] });
  saveLocal(STORAGE_KEY_STORIES, s.slice(-50));
};

export const viewStory = async (storyId: string, userId: string, userName: string) => {
  const stories = getLocal(STORAGE_KEY_STORIES);
  const idx = stories.findIndex((s: any) => s.id === storyId);
  if (idx !== -1) {
    const views = stories[idx].views || [];
    if (!views.some((v: any) => v.userId === userId)) {
      views.push({ userId, userName, timestamp: Date.now() });
      stories[idx].views = views;
      saveLocal(STORAGE_KEY_STORIES, stories);
    }
  }
};

export const deleteStory = async (storyId: string) => {
  const stories = getLocal(STORAGE_KEY_STORIES);
  const filtered = stories.filter((s: any) => s.id !== storyId);
  saveLocal(STORAGE_KEY_STORIES, filtered);
};

export const getStories = async () => getLocal(STORAGE_KEY_STORIES).filter((s: any) => (Date.now() - s.timestamp) < 86400000);
export const likeStory = async (id: string, uid: string) => {
  const s = getLocal(STORAGE_KEY_STORIES);
  const i = s.findIndex((st: any) => st.id === id);
  if (i !== -1) {
    s[i].likes = s[i].likes || [];
    const li = s[i].likes.indexOf(uid);
    if (li === -1) s[i].likes.push(uid); else s[i].likes.splice(li, 1);
    saveLocal(STORAGE_KEY_STORIES, s);
  }
};
export const sendStoryReply = async (rid: string, sid: string, text: string, story: any) => {
  const msg = {
    id: 'm_' + Math.random().toString(36).substr(2, 9),
    senderId: sid, recipientId: rid, text, type: 'story_reply', 
    timestamp: Date.now(), status: 'sent',
    storyContext: { storyId: story.id, mediaUrl: story.mediaUrl, mediaType: story.mediaType }
  };
  await addMessage(msg);
  return msg;
};

export const blockUser = async (my: string, target: string) => {
  const u = getLocal(STORAGE_KEY_USERS);
  const i = u.findIndex((usr: any) => usr.uid === my);
  if (i !== -1) {
    u[i].blockedUsers = u[i].blockedUsers || [];
    if (!u[i].blockedUsers.includes(target)) u[i].blockedUsers.push(target);
    saveLocal(STORAGE_KEY_USERS, u);
  }
};
export const unblockUser = async (my: string, target: string) => {
  const u = getLocal(STORAGE_KEY_USERS);
  const i = u.findIndex((usr: any) => usr.uid === my);
  if (i !== -1) {
    u[i].blockedUsers = (u[i].blockedUsers || []).filter((id: string) => id !== target);
    saveLocal(STORAGE_KEY_USERS, u);
  }
};
