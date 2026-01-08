
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
  // Fetch all chats and filter client side
  const querySnapshot = await getDocs(collection(db, "chats"));
  const allChats = querySnapshot.docs.map(doc => doc.data());
  return allChats.filter((c: any) => c.participants.includes(uid))
                 .sort((a: any, b: any) => b.updatedAt - a.updatedAt);
};

export const getMessages = async (chatId: string) => {
  // Fetch ALL messages and filter/sort client side to avoid Index errors
  try {
    const snapshot = await getDocs(collection(db, "messages"));
    const allMsgs = snapshot.docs.map(doc => doc.data());
    
    let filteredMsgs;
    if (chatId.startsWith('group_')) {
      filteredMsgs = allMsgs.filter((m: any) => m.recipientId === chatId);
    } else {
      const [u1, u2] = chatId.split('_');
      filteredMsgs = allMsgs.filter((m: any) => 
        (m.senderId === u1 && m.recipientId === u2) || 
        (m.senderId === u2 && m.recipientId === u1)
      );
    }
    
    // Client-side sort
    return filteredMsgs.sort((a: any, b: any) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
};

export const addMessage = async (msg: any) => {
  try {
    // Sanitize the message object to remove any 'undefined' fields
    // Firestore throws validation errors if fields are undefined
    const safeMsg = JSON.parse(JSON.stringify(msg));

    // 1. Save Message
    await setDoc(doc(db, "messages", safeMsg.id), safeMsg);

    // 2. Determine Chat ID
    const chatId = safeMsg.recipientId.startsWith('group_') 
      ? safeMsg.recipientId 
      : [safeMsg.senderId, safeMsg.recipientId].sort().join('_');
    
    const chatRef = doc(db, "chats", chatId);
    
    // 3. Update or Create Chat Document
    // Using setDoc with merge: true is safer than checking exists() then update
    const updateData = {
      id: chatId,
      lastMessage: { text: safeMsg.text || 'Media', senderId: safeMsg.senderId, timestamp: safeMsg.timestamp },
      updatedAt: safeMsg.timestamp,
      // Ensure participants are set if creating new, but don't overwrite if existing
      // We'll construct the participants list just in case it's new
      participants: [safeMsg.senderId, safeMsg.recipientId], 
      type: safeMsg.recipientId.startsWith('group_') ? 'group' : 'private'
    };

    // For groups, we don't want to overwrite participants array blindly if it already exists
    // But for private chats, it's always just two people.
    if (updateData.type === 'private') {
       // Ensure unique participants
       updateData.participants = [...new Set([safeMsg.senderId, safeMsg.recipientId])];
    } else {
       // For groups, remove participants from updateData so we don't reset the group list
       // unless we specifically meant to (which we don't here)
       delete (updateData as any).participants; 
    }

    await setDoc(chatRef, updateData, { merge: true });
    console.log("Message sent and chat updated:", chatId);
  } catch (e) {
    console.error("Error adding message:", e);
    throw e;
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
