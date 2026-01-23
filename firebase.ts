
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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
  limit,
  onSnapshot,
  writeBatch
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

// Fallback to process.env if available
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
  
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.log("Firebase Initialized Successfully");
} catch (e) {
  console.error("Firebase Initialization Failed:", e);
  auth = { currentUser: null, onAuthStateChanged: (cb: any) => { cb(null); return () => {}; } };
  db = { collection: () => {} };
}

export { auth, db };

// Helper to abstract Auth State Change
export const observeAuthState = (callback: (user: any) => void) => {
  if (auth && (auth as any).onAuthStateChanged) {
    return (auth as any).onAuthStateChanged(callback);
  }
  return onAuthStateChanged(auth, callback);
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) { /* fallback */ }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const sanitizeData = (data: any, seen = new WeakSet()): any => {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (data instanceof Date) return data.getTime();
  if (data.nodeType && typeof data.cloneNode === 'function') return '[DOM Node]';
  if (data.$$typeof) return '[React Element]';
  if (data._reactInternals) return '[React Internals]';
  if (seen.has(data)) return '[Circular]';
  seen.add(data);
  if (Array.isArray(data)) return data.map(item => sanitizeData(item, seen));
  const out: any = {};
  for (const k in data) {
    if (k.startsWith('__react') || k === '_owner' || k === 'stateNode') continue;
    if (Object.prototype.hasOwnProperty.call(data, k)) {
      const val = data[k];
      if (val !== undefined) out[k] = sanitizeData(val, seen);
    }
  }
  return out;
};

// --- AUTHENTICATION ---

export const updateUserStatus = async (uid: string, status: 'online' | 'offline') => {
  if (!db || !db.type) return; 
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      status: status,
      lastSeen: Date.now()
    });
  } catch (e) { }
};

export const makeUserAdmin = async (uid: string) => {
  try {
    await updateDoc(doc(db, "users", uid), { isAdmin: true });
  } catch(e) { console.error("Failed to make admin", e); }
};

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const userCredential = await firebaseSignIn(authObj, email, pass);
  await updateUserStatus(userCredential.user.uid, 'online');
  return userCredential;
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const userCredential = await firebaseCreateUser(authObj, email, pass);
  const user = userCredential.user;
  
  const isAdmin = email.toLowerCase() === 'betterrroxx@gmail.com';

  const newUserProfile = {
    uid: user.uid,
    email: user.email?.toLowerCase(),
    name: user.email?.split('@')[0] || 'User',
    photoURL: `https://picsum.photos/seed/${user.uid}/200`,
    status: 'online',
    lastSeen: Date.now(),
    bio: 'Hey there! I am using ROXX CHATS.',
    blockedUsers: [],
    pinnedChats: [],
    isAdmin: isAdmin,
    isGloballyBlocked: false,
    privacySettings: {
      lastSeen: 'everyone',
      readReceipts: true
    }
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

  const isAdmin = user.email?.toLowerCase() === 'betterrroxx@gmail.com';

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
      pinnedChats: [],
      isAdmin: isAdmin,
      isGloballyBlocked: false,
      privacySettings: { lastSeen: 'everyone', readReceipts: true }
    });
  } else {
    if (isAdmin && !userSnap.data().isAdmin) {
       await updateDoc(userRef, { isAdmin: true });
    }
    await updateUserStatus(user.uid, 'online');
  }
  return res;
};

export const signOut = async () => {
  if (auth.currentUser) {
    await updateUserStatus(auth.currentUser.uid, 'offline');
  }
  await firebaseSignOut(auth);
};

export const updateProfile = async (user: any, updates: any) => {
  const uid = user.uid || user.id;
  await updateDoc(doc(db, "users", uid), updates);
  if (auth.currentUser) {
    try {
        const authUpdates: any = {};
        if (updates.name) authUpdates.displayName = updates.name;
        if (updates.photoURL && !updates.photoURL.startsWith('data:')) {
            authUpdates.photoURL = updates.photoURL;
        }
        if (Object.keys(authUpdates).length > 0) {
            await firebaseUpdateProfile(auth.currentUser, authUpdates);
        }
    } catch (e) { }
  }
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

export const subscribeToUser = (uid: string, callback: (user: any) => void) => {
  return onSnapshot(doc(db, "users", uid), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

// --- FEATURE 3: NICKNAMES ---

export const setNickname = async (myUid: string, targetUid: string, nickname: string) => {
  if (!nickname.trim()) {
    await deleteDoc(doc(db, "users", myUid, "nicknames", targetUid));
  } else {
    await setDoc(doc(db, "users", myUid, "nicknames", targetUid), { name: nickname });
    
    // Send a private system message to myself about the change (as per req, but private)
    // Actually, prompt says "Send system notification message in chat". 
    // To respect "Other users should NOT see", we make this a local event or a private message type.
    const chatId = [myUid, targetUid].sort().join('_');
    const msg = {
      id: 'sys_' + generateUUID(),
      senderId: 'system',
      recipientId: chatId,
      text: `You set a nickname: ${nickname}`,
      type: 'system',
      timestamp: Date.now(),
      status: 'seen',
      visibleTo: [myUid] // Logic to filter this in MessageBubble if needed
    };
    await addMessage(msg);
  }
};

export const subscribeToNicknames = (myUid: string, callback: (nicknames: Record<string, string>) => void) => {
  return onSnapshot(collection(db, "users", myUid, "nicknames"), (snapshot) => {
    const mapping: Record<string, string> = {};
    snapshot.forEach(doc => {
      mapping[doc.id] = doc.data().name;
    });
    callback(mapping);
  });
};

// --- MESSAGING ---

export const getMyChats = async (uid: string) => {
  const querySnapshot = await getDocs(collection(db, "chats"));
  const allChats = querySnapshot.docs.map(doc => doc.data());
  return allChats.filter((c: any) => c.participants && c.participants.includes(uid))
                 .sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

export const getMessages = async (chatId: string) => {
  try {
    const snapshot = await getDocs(collection(db, "messages"));
    const allMsgs = snapshot.docs.map(doc => doc.data());
    const currentUid = auth.currentUser?.uid;
    
    let filteredMsgs;
    if (chatId.startsWith('group_')) {
      filteredMsgs = allMsgs.filter((m: any) => m.recipientId === chatId);
    } else {
      const [u1, u2] = chatId.split('_');
      filteredMsgs = allMsgs.filter((m: any) => 
        (m.senderId === u1 && m.recipientId === u2) || 
        (m.senderId === u2 && m.recipientId === u1) ||
        (m.recipientId === chatId) // For system messages
      );
    }

    if (currentUid) {
      filteredMsgs = filteredMsgs.filter((m: any) => {
        // Feature 3: Private System Messages
        if (m.visibleTo && !m.visibleTo.includes(currentUid)) return false;
        return !m.deletedFor?.includes(currentUid);
      });
    }

    return filteredMsgs.sort((a: any, b: any) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
};

export const addMessage = async (msg: any) => {
  try {
    const safeMsg = sanitizeData(msg); 
    
    // Blocking Check (skip for system messages)
    if (!safeMsg.recipientId.startsWith('group_') && safeMsg.senderId !== 'system') {
        const recipientRef = doc(db, "users", safeMsg.recipientId);
        const recipientSnap = await getDoc(recipientRef);
        if (recipientSnap.exists() && recipientSnap.data().blockedUsers?.includes(safeMsg.senderId)) {
            await setDoc(doc(db, "messages", safeMsg.id), safeMsg);
            return; 
        }
    }

    await setDoc(doc(db, "messages", safeMsg.id), safeMsg);

    // Only update chat snippet if it's a real message
    if (safeMsg.type !== 'system') {
      const chatId = safeMsg.recipientId.startsWith('group_') 
        ? safeMsg.recipientId 
        : [safeMsg.senderId, safeMsg.recipientId].sort().join('_');
      
      const chatRef = doc(db, "chats", chatId);
      const updateData: any = {
        id: chatId,
        lastMessage: { 
          text: safeMsg.type === 'voice' ? '🎤 Voice' : safeMsg.type === 'image' ? '📷 Image' : (safeMsg.text || 'Media'), 
          senderId: safeMsg.senderId, 
          timestamp: safeMsg.timestamp 
        },
        updatedAt: safeMsg.timestamp,
        participants: [safeMsg.senderId, safeMsg.recipientId], 
        type: safeMsg.recipientId.startsWith('group_') ? 'group' : 'private'
      };

      if (updateData.type === 'private') {
         updateData.participants = [...new Set([safeMsg.senderId, safeMsg.recipientId])];
      } else {
         delete updateData.participants; 
      }

      await setDoc(chatRef, updateData, { merge: true });
    }
  } catch (e) {
    console.error("Error adding message:", e);
    throw e;
  }
};

export const toggleMessageReaction = async (messageId: string, emoji: string, userId: string) => {
  const msgRef = doc(db, "messages", messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const reactions = data.reactions || {};
    
    const userList = reactions[emoji] || [];
    if (userList.includes(userId)) {
      reactions[emoji] = userList.filter((id: string) => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...userList, userId];
    }
    await updateDoc(msgRef, { reactions });
  } catch (e) { }
};

export const voteOnPoll = async (messageId: string, optionId: string, userId: string) => {
  const msgRef = doc(db, "messages", messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.type !== 'poll' || !data.poll) return;

    const poll = data.poll;
    if (!poll.allowMultiple) {
      poll.options.forEach((opt: any) => {
        if (opt.id !== optionId) opt.votes = opt.votes.filter((uid: string) => uid !== userId);
      });
    }

    const targetOpt = poll.options.find((o: any) => o.id === optionId);
    if (targetOpt) {
      if (targetOpt.votes.includes(userId)) targetOpt.votes = targetOpt.votes.filter((uid: string) => uid !== userId);
      else targetOpt.votes.push(userId);
    }
    await updateDoc(msgRef, { poll });
  } catch (e) { }
};

export const editMessage = async (messageId: string, newText: string) => {
    try {
        await updateDoc(doc(db, "messages", messageId), { text: newText, isEdited: true });
    } catch (e) { }
};

export const deleteMessageForEveryone = async (messageId: string) => {
    try {
        await updateDoc(doc(db, "messages", messageId), {
            type: 'deleted',
            text: '🚫 This message was deleted',
            fileUrl: null, audioUrl: null, poll: null, stickerUrl: null
        });
    } catch (e) { }
};

export const deleteMessageForMe = async (messageId: string, userId: string) => {
    try {
        await updateDoc(doc(db, "messages", messageId), { deletedFor: arrayUnion(userId) });
    } catch (e) { }
};

export const deleteMessage = async (messageId: string, chatId: string) => {
  await deleteDoc(doc(db, "messages", messageId));
};

export const setTypingStatus = async (chatId: string, userId: string, isTyping: boolean) => {
  try {
    const chatRef = doc(db, "chats", chatId);
    await setDoc(chatRef, { typing: { [userId]: isTyping } }, { merge: true });
  } catch (e) { }
};

export const togglePinChat = async (userId: string, chatId: string) => {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const pinned = userSnap.data().pinnedChats || [];
            if (pinned.includes(chatId)) await updateDoc(userRef, { pinnedChats: arrayRemove(chatId) });
            else await updateDoc(userRef, { pinnedChats: arrayUnion(chatId) });
        }
    } catch (e) { }
};

export const togglePinMessage = async (chatId: string, messageId: string) => {
    try {
        const chatRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatRef);
        if(chatSnap.exists()) {
            const pinned = chatSnap.data().pinnedMessages || [];
            if(pinned.includes(messageId)) await updateDoc(chatRef, { pinnedMessages: arrayRemove(messageId) });
            else await updateDoc(chatRef, { pinnedMessages: arrayUnion(messageId) });
        }
    } catch (e) { }
};

export const subscribeToChat = (chatId: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, "chats", chatId), (doc) => {
    if (doc.exists()) callback(doc.data());
  });
};

export const createGroup = async (name: string, participants: string[], adminId: string) => {
  const groupId = 'group_' + generateUUID();
  const newGroup = {
    id: groupId,
    type: 'group',
    name,
    description: 'Welcome to the group!',
    participants: [...participants, adminId],
    adminIds: [adminId],
    updatedAt: Date.now(),
    lockedBy: []
  };
  await setDoc(doc(db, "chats", groupId), newGroup);
  
  // System msg
  const sysMsg = {
    id: 'sys_' + generateUUID(),
    senderId: 'system',
    recipientId: groupId,
    text: `Group "${name}" created`,
    type: 'system',
    timestamp: Date.now(),
    status: 'sent'
  };
  await addMessage(sysMsg);
  
  return newGroup;
};

// --- FEATURE 1: GROUP MEMBERS ---

export const addMembersToGroup = async (chatId: string, newMemberIds: string[], adminName: string) => {
  const chatRef = doc(db, "chats", chatId);
  
  // Update participants
  await updateDoc(chatRef, {
    participants: arrayUnion(...newMemberIds)
  });

  // Fetch names for system message
  const newMembers: string[] = [];
  for (const uid of newMemberIds) {
    const u = await getUserById(uid);
    if(u) newMembers.push(u.name);
  }

  // Add system message
  const msg = {
    id: 'sys_' + generateUUID(),
    senderId: 'system',
    recipientId: chatId,
    text: `${adminName} added ${newMembers.join(', ')}`,
    type: 'system',
    timestamp: Date.now(),
    status: 'sent'
  };
  await addMessage(msg);
};

export const leaveGroup = async (chatId: string, userId: string) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    participants: arrayRemove(userId),
    adminIds: arrayRemove(userId)
  });
};

export const removeGroupMember = async (chatId: string, userId: string) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    participants: arrayRemove(userId),
    adminIds: arrayRemove(userId)
  });
};

export const makeGroupAdmin = async (chatId: string, userId: string) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, { adminIds: arrayUnion(userId) });
};

export const updateGroupInfo = async (chatId: string, name: string, iconUrl?: string, description?: string) => {
  const chatRef = doc(db, "chats", chatId);
  const data: any = { name };
  if (iconUrl) data.groupIcon = iconUrl;
  if (description !== undefined) data.description = description;
  await updateDoc(chatRef, data);
};

export const toggleChatLock = async (chatId: string, userId: string) => {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (snap.exists()) {
    const data = snap.data();
    let lockedBy = data.lockedBy || [];
    if (lockedBy.includes(userId)) lockedBy = lockedBy.filter((id: string) => id !== userId);
    else lockedBy.push(userId);
    await updateDoc(chatRef, { lockedBy });
  }
};

// --- FEATURE 4: APP LOCK SETTINGS ---

export const setAppLockPin = async (userId: string, pin: string) => {
  await updateDoc(doc(db, "users", userId), { "security.appLockPin": pin });
};

export const disableAppLock = async (userId: string) => {
  await updateDoc(doc(db, "users", userId), { "security.appLockPin": null });
};

// --- CALLING ---

export const initiateCall = async (callerId: string, receiverId: string, type: 'voice' | 'video') => {
  const callId = 'call_' + generateUUID();
  const newCall = {
    id: callId,
    callerId,
    receiverId,
    type,
    status: 'ringing',
    timestamp: Date.now(),
    callerCandidates: [],
    calleeCandidates: []
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
  const calls = snapshot.docs.map(doc => doc.data());
  return calls.sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
};

export const updateCallStatus = async (callId: string, status: string) => {
  await updateDoc(doc(db, "calls", callId), { status });
};

export const updateCallSignal = async (callId: string, data: any) => {
  await setDoc(doc(db, "calls", callId), data, { merge: true });
};

export const addIceCandidate = async (callId: string, candidate: any, type: 'caller' | 'callee') => {
  const callRef = doc(db, "calls", callId);
  const field = type === 'caller' ? 'callerCandidates' : 'calleeCandidates';
  await updateDoc(callRef, { [field]: arrayUnion(sanitizeData(candidate)) });
};

export const subscribeToCall = (callId: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, "calls", callId), (doc) => {
    if (doc.exists()) callback(doc.data());
  });
};

export const getCallById = async (callId: string) => {
  const snap = await getDoc(doc(db, "calls", callId));
  return snap.exists() ? snap.data() : null;
};

export const cleanOldCalls = async () => { };

// --- STORIES & NOTES ---
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
  await updateDoc(storyRef, { views: arrayUnion({ userId, userName, timestamp: Date.now() }) });
};
export const likeStory = async (storyId: string, userId: string) => {
  const storyRef = doc(db, "stories", storyId);
  const snap = await getDoc(storyRef);
  if(snap.exists()) {
    const likes = snap.data().likes || [];
    if(likes.includes(userId)) await updateDoc(storyRef, { likes: arrayRemove(userId) });
    else await updateDoc(storyRef, { likes: arrayUnion(userId) });
  }
};
export const deleteStory = async (storyId: string) => {
  await deleteDoc(doc(db, "stories", storyId));
};
export const sendStoryReply = async (rid: string, sid: string, text: string, story: any) => {
  const msg = {
    id: 'm_' + generateUUID(),
    senderId: sid, recipientId: rid, text, type: 'story_reply', 
    timestamp: Date.now(), status: 'sent',
    storyContext: { storyId: story.id, mediaUrl: story.mediaUrl, mediaType: story.mediaType }
  };
  await addMessage(msg);
  return msg;
};

// --- NOTES ---
export const addNote = async (userId: string, userName: string, userPhoto: string, text: string) => {
  const noteId = `note_${userId}`;
  const note = { id: noteId, userId, userName, userPhoto, text, timestamp: Date.now() };
  await setDoc(doc(db, "notes", noteId), note);
  return note;
};

export const getNotes = async () => {
  const yesterday = Date.now() - 86400000;
  const q = query(collection(db, "notes"), where("timestamp", ">", yesterday));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

// --- SAVED MEDIA (APP GALLERY) ---
export const saveMediaToGallery = async (userId: string, mediaUrl: string, mediaType: 'image' | 'video', senderName: string) => {
  const id = 'saved_' + generateUUID();
  const item = { id, userId, mediaUrl, mediaType, savedAt: Date.now(), originalSenderName: senderName };
  await setDoc(doc(db, "saved_media", id), item);
};

export const getSavedGallery = async (userId: string) => {
  const q = query(collection(db, "saved_media"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data()).sort((a: any, b: any) => b.savedAt - a.savedAt);
};

export const deleteSavedMedia = async (id: string) => {
  await deleteDoc(doc(db, "saved_media", id));
};

// --- ADMIN ---
export const admin_getAllUsers = async () => getAllUsers();
export const admin_toggleAdminAccess = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) await updateDoc(userRef, { isAdmin: !snap.data().isAdmin });
};
export const admin_toggleGlobalBlock = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) await updateDoc(userRef, { isGloballyBlocked: !snap.data().isGloballyBlocked });
};
export const admin_deleteUser = async (uid: string) => {
  await deleteDoc(doc(db, "users", uid));
};
export const admin_getStats = async () => {
  const u = await getDocs(collection(db, "users"));
  const m = await getDocs(collection(db, "messages"));
  const c = await getDocs(collection(db, "chats"));
  const s = await getDocs(collection(db, "stories"));
  return { users: u.size, messages: m.size, chats: c.size, stories: s.size };
};
export const blockUser = async (myUid: string, targetUid: string) => {
  await updateDoc(doc(db, "users", myUid), { blockedUsers: arrayUnion(targetUid) });
};
export const unblockUser = async (myUid: string, targetUid: string) => {
  await updateDoc(doc(db, "users", myUid), { blockedUsers: arrayRemove(targetUid) });
};
