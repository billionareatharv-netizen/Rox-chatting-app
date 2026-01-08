import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword as firebaseSignIn, 
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  signInWithPopup as firebaseSignInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  query, 
  where,
  addDoc,
  deleteDoc,
  orderBy,
  limit
} from "firebase/firestore";

// --- CONFIGURATION START ---
const firebaseConfig = {
  apiKey: "AIzaSyBIsKjnvYeIOBK2E1sYxwBnfsBhGTilKa0",
  authDomain: "roxx-chats-final.firebaseapp.com",
  projectId: "roxx-chats-final",
  storageBucket: "roxx-chats-final.firebasestorage.app",
  messagingSenderId: "139043918012",
  appId: "1:139043918012:web:c5b8ab870e518093c700b9",
  measurementId: "G-T0M4876W9M"
};
// --- CONFIGURATION END ---

// Fallback to process.env if available (for Vercel deployments)
const config = {
  apiKey: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_API_KEY) || firebaseConfig.apiKey,
  authDomain: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_AUTH_DOMAIN) || firebaseConfig.authDomain,
  projectId: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_PROJECT_ID) || firebaseConfig.projectId,
  storageBucket: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_STORAGE_BUCKET) || firebaseConfig.storageBucket,
  messagingSenderId: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseConfig.messagingSenderId,
  appId: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_APP_ID) || firebaseConfig.appId
};

// Initialize Firebase
let app;
let auth: any;
let db: any;

try {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Firebase Initialized");
} catch (e) {
  console.error("Firebase Initialization Failed. Did you replace the config keys in firebase.ts?", e);
  // Prevent crash on load if keys are bad, but app won't work
  auth = { currentUser: null, onAuthStateChanged: () => {} };
  db = { collection: () => {} };
}

export { auth, db };

// --- AUTHENTICATION ---

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const userCredential = await firebaseSignIn(authObj, email, pass);
  // Update status to online
  await updateDoc(doc(db, "users", userCredential.user.uid), {
    status: 'online',
    lastSeen: Date.now()
  });
  const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
  
  if (userDoc.exists() && userDoc.data().isGloballyBlocked) {
    await firebaseSignOut(authObj);
    throw new Error("This account has been suspended by an administrator.");
  }
  
  return userCredential;
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const userCredential = await firebaseCreateUser(authObj, email, pass);
  const user = userCredential.user;
  
  const newUserProfile = {
    uid: user.uid,
    email: user.email?.toLowerCase(),
    name: user.email?.split('@')[0] || 'User',
    photoURL: `https://picsum.photos/seed/${user.uid}/200`,
    status: 'online',
    lastSeen: Date.now(),
    bio: 'Hey there! I am using ROXX CHATS.',
    blockedUsers: [],
    lockedChats: [],
    chatLockPassword: '',
    isAdmin: false,
    isGloballyBlocked: false
  };

  await setDoc(doc(db, "users", user.uid), newUserProfile);
  return userCredential;
};

export const signInWithPopup = async () => {
  const provider = new GoogleAuthProvider();
  const res = await firebaseSignInWithPopup(auth, provider);
  const user = res.user;
  
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email?.toLowerCase(),
      name: user.displayName || 'Google User',
      photoURL: user.photoURL,
      status: 'online',
      lastSeen: Date.now(),
      bio: 'Hey there! I am using ROXX CHATS.',
      blockedUsers: [],
      lockedChats: [],
      chatLockPassword: '',
      isAdmin: false,
      isGloballyBlocked: false
    });
  } else {
    if (userSnap.data().isGloballyBlocked) {
      await firebaseSignOut(auth);
      throw new Error("This account has been suspended.");
    }
    await updateDoc(userRef, { status: 'online', lastSeen: Date.now() });
  }
  return res;
};

export const signOut = async () => {
  if (auth.currentUser) {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      status: 'offline',
      lastSeen: Date.now()
    });
  }
  await firebaseSignOut(auth);
};

export const updateProfile = async (user: any, updates: any) => {
  const uid = user.uid || user.id;
  if (auth.currentUser) {
    await firebaseUpdateProfile(auth.currentUser, {
      displayName: updates.name || user.name,
      photoURL: updates.photoURL || user.photoURL
    });
  }
  await updateDoc(doc(db, "users", uid), updates);
  return { ...user, ...updates };
};

// --- DATA ACCESS ---

export const getAllUsers = async () => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => doc.data()).filter((u: any) => !u.isGloballyBlocked);
};

export const getUserById = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

// --- MESSAGING ---

export const getMyChats = async (uid: string) => {
  // Firestore doesn't support array-contains for multiple fields easily without index
  // For simplicity, fetching all chats and filtering client side for now.
  // In production, you would maintain a 'user_chats' subcollection.
  const querySnapshot = await getDocs(collection(db, "chats"));
  const allChats = querySnapshot.docs.map(doc => doc.data());
  return allChats.filter((c: any) => c.participants.includes(uid))
                 .sort((a: any, b: any) => b.updatedAt - a.updatedAt);
};

export const getMessages = async (chatId: string) => {
  // Query messages where recipientId OR senderId matches context
  // Simpler approach: Fetch messages with specific recipientId (group) OR involved in chat
  // We'll filter by a 'chatId' field if possible, but our message model uses sender/recipient
  // Best approach for this schema:
  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);
  const allMsgs = snapshot.docs.map(doc => doc.data());
  
  if (chatId.startsWith('group_')) {
    return allMsgs.filter((m: any) => m.recipientId === chatId);
  } else {
    const [u1, u2] = chatId.split('_');
    return allMsgs.filter((m: any) => 
      (m.senderId === u1 && m.recipientId === u2) || 
      (m.senderId === u2 && m.recipientId === u1)
    );
  }
};

export const addMessage = async (msg: any) => {
  await setDoc(doc(db, "messages", msg.id), msg);

  // Update Chat Metadata
  const chatId = msg.recipientId.startsWith('group_') 
    ? msg.recipientId 
    : [msg.senderId, msg.recipientId].sort().join('_');
  
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  const updateData = {
    lastMessage: { text: msg.text, senderId: msg.senderId, timestamp: msg.timestamp },
    updatedAt: msg.timestamp
  };

  if (chatSnap.exists()) {
    await updateDoc(chatRef, updateData);
  } else {
    // Create new chat
    await setDoc(chatRef, {
      id: chatId,
      type: 'private',
      participants: [msg.senderId, msg.recipientId],
      lockedBy: [],
      ...updateData
    });
  }
};

export const createGroup = async (name: string, participants: string[], adminId: string) => {
  const groupId = 'group_' + crypto.randomUUID();
  const newGroup = {
    id: groupId,
    type: 'group',
    name,
    participants: [...participants, adminId],
    adminIds: [adminId],
    updatedAt: Date.now(),
    lockedBy: []
  };
  await setDoc(doc(db, "chats", groupId), newGroup);
  return newGroup;
};

export const markMessagesAsDelivered = async (chatId: string, userId: string) => {
  // Real implementation would require batched updates
  // For now, we skip to save reads/writes in this simplified version
};

export const markMessagesAsSeen = async (chatId: string, userId: string) => {
  // Simplified: In a real app, update specific message docs
};

export const toggleChatLock = async (chatId: string, userId: string) => {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (snap.exists()) {
    const data = snap.data();
    let lockedBy = data.lockedBy || [];
    if (lockedBy.includes(userId)) {
      lockedBy = lockedBy.filter((id: string) => id !== userId);
    } else {
      lockedBy.push(userId);
    }
    await updateDoc(chatRef, { lockedBy });
  }
};

// --- CALLING (Signaling) ---

export const initiateCall = async (callerId: string, receiverId: string, type: 'voice' | 'video') => {
  const callId = 'call_' + crypto.randomUUID();
  const newCall = {
    id: callId,
    callerId,
    receiverId,
    type,
    status: 'ringing',
    timestamp: Date.now()
  };
  await setDoc(doc(db, "calls", callId), newCall);
  return newCall;
};

export const getIncomingCall = async (userId: string) => {
  const q = query(
    collection(db, "calls"), 
    where("receiverId", "==", userId),
    where("status", "==", "ringing")
  );
  const snapshot = await getDocs(q);
  // Filter for recent calls (last 60s) client side or via query
  const calls = snapshot.docs.map(doc => doc.data());
  return calls.find((c: any) => (Date.now() - c.timestamp) < 60000);
};

export const updateCallStatus = async (callId: string, status: string) => {
  await updateDoc(doc(db, "calls", callId), { status });
};

export const getCallById = async (callId: string) => {
  const snap = await getDoc(doc(db, "calls", callId));
  return snap.exists() ? snap.data() : null;
};

export const cleanOldCalls = async () => {
  // Cleanup would happen via Cloud Functions typically
};

// --- STORIES ---

export const addStory = async (story: any) => {
  await setDoc(doc(db, "stories", story.id), { ...story, likes: [], views: [] });
};

export const getStories = async () => {
  const yesterday = Date.now() - 86400000;
  const q = query(collection(db, "stories"), where("timestamp", ">", yesterday));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const viewStory = async (storyId: string, userId: string, userName: string) => {
  const storyRef = doc(db, "stories", storyId);
  const snap = await getDoc(storyRef);
  if (snap.exists()) {
    const views = snap.data().views || [];
    if (!views.some((v: any) => v.userId === userId)) {
      await updateDoc(storyRef, {
        views: arrayUnion({ userId, userName, timestamp: Date.now() })
      });
    }
  }
};

export const likeStory = async (storyId: string, userId: string) => {
  const storyRef = doc(db, "stories", storyId);
  const snap = await getDoc(storyRef);
  if (snap.exists()) {
    const likes = snap.data().likes || [];
    if (likes.includes(userId)) {
      await updateDoc(storyRef, { likes: arrayRemove(userId) });
    } else {
      await updateDoc(storyRef, { likes: arrayUnion(userId) });
    }
  }
};

export const deleteStory = async (storyId: string) => {
  await deleteDoc(doc(db, "stories", storyId));
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

// --- ADMIN ---

export const admin_getAllUsers = async () => getAllUsers();

export const admin_toggleAdminAccess = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    await updateDoc(userRef, { isAdmin: !snap.data().isAdmin });
  }
};

export const admin_toggleGlobalBlock = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    await updateDoc(userRef, { isGloballyBlocked: !snap.data().isGloballyBlocked });
  }
};

export const admin_deleteUser = async (uid: string) => {
  await deleteDoc(doc(db, "users", uid));
  // In real app, must also delete messages, chats, etc.
};

export const admin_getStats = async () => {
  const u = await getDocs(collection(db, "users"));
  const m = await getDocs(collection(db, "messages"));
  const c = await getDocs(collection(db, "chats"));
  const s = await getDocs(collection(db, "stories"));
  return {
    users: u.size,
    messages: m.size,
    chats: c.size,
    stories: s.size
  };
};

export const blockUser = async (myUid: string, targetUid: string) => {
  await updateDoc(doc(db, "users", myUid), {
    blockedUsers: arrayUnion(targetUid)
  });
};

export const unblockUser = async (myUid: string, targetUid: string) => {
  await updateDoc(doc(db, "users", myUid), {
    blockedUsers: arrayRemove(targetUid)
  });
};
