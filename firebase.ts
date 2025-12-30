/**
 * MOCK FIREBASE IMPLEMENTATION (SAFE FOR ALL BROWSERS)
 */

// ---------- SAFE UUID GENERATOR ----------
const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// ---------- STORAGE KEYS ----------
const STORAGE_KEY_USERS = 'gemini_chat_db_users';
const STORAGE_KEY_SESSION = 'chat_session';
const STORAGE_KEY_STORIES = 'gemini_chat_db_stories';
const STORAGE_KEY_MESSAGES = 'gemini_chat_db_messages';
const STORAGE_KEY_CHATS = 'gemini_chat_db_chats';
const STORAGE_KEY_CALLS = 'gemini_chat_db_calls';

// ---------- LOCAL STORAGE HELPERS ----------
const getLocal = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError') {
      const messages = getLocal(STORAGE_KEY_MESSAGES);
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages.slice(-20)));
      localStorage.setItem(key, JSON.stringify(data));
    } else {
      throw e;
    }
  }
};

// ---------- SEED USERS ----------
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

// ---------- AUTH ----------
let authListeners: Array<(user: any) => void> = [];

export const auth: any = {
  currentUser: null,
  onAuthStateChanged(callback: (user: any) => void) {
    authListeners.push(callback);
    const saved = localStorage.getItem(STORAGE_KEY_SESSION);
    callback(saved ? JSON.parse(saved) : null);
    return () => authListeners = authListeners.filter(l => l !== callback);
  }
};

const notifyAuthListeners = (user: any) => {
  auth.currentUser = user;
  authListeners.forEach(cb => cb(user));
};

// ---------- AUTH FUNCTIONS ----------
export const signInWithEmailAndPassword = async (_: any, email: string, pass: string) => {
  const users = getLocal(STORAGE_KEY_USERS);
  const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) throw new Error("auth/user-not-found");
  if (user.password !== pass) throw new Error("auth/wrong-password");

  user.status = 'online';
  user.lastSeen = Date.now();
  saveLocal(STORAGE_KEY_USERS, users);

  const { password, ...profile } = user;
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(profile));
  notifyAuthListeners(profile);
  return { user: profile };
};

export const createUserWithEmailAndPassword = async (_: any, email: string, pass: string) => {
  const users = getLocal(STORAGE_KEY_USERS);

  if (users.some((u: any) => u.email === email)) {
    throw new Error("auth/email-already-in-use");
  }

  const newUser = {
    uid: generateUUID(),
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

  const { password, ...profile } = newUser;
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(profile));
  notifyAuthListeners(profile);
  return { user: profile };
};

export const signOut = async () => {
  localStorage.removeItem(STORAGE_KEY_SESSION);
  notifyAuthListeners(null);
};

// ---------- DATABASE MOCK ----------
export const db: any = { collection: (name: string) => ({ name }) };

// ---------- MESSAGE FUNCTIONS ----------
export const addMessage = async (msg: any) => {
  const messages = getLocal(STORAGE_KEY_MESSAGES);
  messages.push(msg);
  saveLocal(STORAGE_KEY_MESSAGES, messages.slice(-500));
};

export const getMessages = async (chatId: string) => {
  const all = getLocal(STORAGE_KEY_MESSAGES);
  return all.filter((m: any) => m.recipientId === chatId || m.senderId === chatId);
};

// ---------- CHAT / GROUP ----------
export const createGroup = async (name: string, participants: string[], adminId: string) => {
  const chats = getLocal(STORAGE_KEY_CHATS);
  const group = {
    id: 'group_' + generateUUID(),
    type: 'group',
    name,
    participants: [...participants, adminId],
    adminIds: [adminId],
    updatedAt: Date.now(),
    lockedBy: []
  };
  chats.push(group);
  saveLocal(STORAGE_KEY_CHATS, chats);
  return group;
};
