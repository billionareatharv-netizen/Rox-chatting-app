
// ... existing imports ...
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
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { UserSubscription, PremiumCustomization, PlanType, UserRole, StoreItem, Song, Post } from './types';
import { calculateExpiry, getPlanDetails } from './premiumUtils';

// ... existing config and initialization ...
const firebaseConfig = {
  apiKey: "AIzaSyBIsKjnvYeIOBK2E1sYxwBnfsBhGTilKa0",
  authDomain: "roxx-chats-final.firebaseapp.com",
  projectId: "roxx-chats-final",
  storageBucket: "roxx-chats-final.firebasestorage.app",
  messagingSenderId: "139043918012",
  appId: "1:139043918012:web:c5b8ab870e518093c700b9",
  measurementId: "G-T0M4876W9M"
};

const config = {
  apiKey: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_API_KEY) || firebaseConfig.apiKey,
  authDomain: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_AUTH_DOMAIN) || firebaseConfig.authDomain,
  projectId: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_PROJECT_ID) || firebaseConfig.projectId,
  storageBucket: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_STORAGE_BUCKET) || firebaseConfig.storageBucket,
  messagingSenderId: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseConfig.messagingSenderId,
  appId: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_APP_ID) || firebaseConfig.appId
};

let app;
let auth: any;
let db: any;
let storage: any;

try {
  app = initializeApp(config);
  auth = getAuth(app);
  storage = getStorage(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  auth = { currentUser: null, onAuthStateChanged: (cb: any) => { cb(null); return () => {}; } };
  db = { collection: () => {} };
  storage = {};
}

export { auth, db, storage };

// ... existing helper functions (sanitizeData, generateUUID, etc) ...
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const sanitizeData = (data: any, seen = new WeakSet()): any => {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (data instanceof Date) return data.getTime();
  if (seen.has(data)) return '[Circular]';
  seen.add(data);
  if (Array.isArray(data)) return data.map(item => sanitizeData(item, seen));
  const out: any = {};
  for (const k in data) {
    if (Object.prototype.hasOwnProperty.call(data, k)) {
      const val = data[k];
      if (val !== undefined && typeof val !== 'function') out[k] = sanitizeData(val, seen);
    }
  }
  return out;
};

export const safeJsonStringify = (value: any) => {
  try { return JSON.stringify(sanitizeData(value)); } 
  catch (e) { return "{}"; }
};

export const observeAuthState = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ... existing Auth & User functions ...
export const updateUserStatus = async (uid: string, status: 'online' | 'offline') => {
  try { await updateDoc(doc(db, "users", uid), { status: status, lastSeen: Date.now() }); } catch (e) { }
};

export const makeUserAdmin = async (uid: string, role: UserRole = 'admin') => {
  try { await updateDoc(doc(db, "users", uid), { isAdmin: true, role: role }); } catch(e) { }
};

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const userCredential = await firebaseSignIn(authObj, email, pass);
  await updateUserStatus(userCredential.user.uid, 'online');
  return userCredential;
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const userCredential = await firebaseCreateUser(authObj, email, pass);
  const user = userCredential.user;
  let role: UserRole = 'user';
  if (email.toLowerCase() === 'betterrroxx@gmail.com') role = 'owner';

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
    isAdmin: role !== 'user',
    role: role,
    isGloballyBlocked: false,
    privacySettings: { lastSeen: 'everyone', readReceipts: true },
    subscription: { plan: 'free', isActive: false, startDate: Date.now(), expiryDate: Date.now() },
    premiumCustomization: {},
    wallpapers: { default: 'default' }
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
  let role: UserRole = 'user';
  if (user.email?.toLowerCase() === 'betterrroxx@gmail.com') role = 'owner';

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
      isAdmin: role !== 'user',
      role: role,
      isGloballyBlocked: false,
      privacySettings: { lastSeen: 'everyone', readReceipts: true },
      subscription: { plan: 'free', isActive: false, startDate: Date.now(), expiryDate: Date.now() },
      premiumCustomization: {},
      wallpapers: { default: 'default' }
    });
  } else {
    if (role === 'owner' && userSnap.data().role !== 'owner') {
       await updateDoc(userRef, { isAdmin: true, role: 'owner' });
    }
    await updateUserStatus(user.uid, 'online');
  }
  return res;
};

export const signOut = async () => {
  if (auth.currentUser) await updateUserStatus(auth.currentUser.uid, 'offline');
  await firebaseSignOut(auth);
};

export const updateProfile = async (user: any, updates: any) => {
  const uid = user.uid || user.id;
  await updateDoc(doc(db, "users", uid), updates);
  return { ...user, ...updates };
};

export const saveWallpaper = async (userId: string, target: string, wallpaper: string) => {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { wallpapers: { [target]: wallpaper } }, { merge: true });
};

export const updatePrivacySettings = async (userId: string, settings: any) => {
    await updateDoc(doc(db, "users", userId), { privacySettings: settings });
};

// --- NEW: POSTS COLLECTION FUNCTIONS ---

export const addPost = async (post: Omit<Post, 'id' | 'likes' | 'bookmarks' | 'commentCount'>) => {
  const postId = 'post_' + generateUUID();
  const fullPost: Post = {
    ...post,
    id: postId,
    likes: [],
    bookmarks: [],
    commentCount: 0
  };
  await setDoc(doc(db, "posts", postId), fullPost);
  return fullPost;
};

export const getFeedPosts = async () => {
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as Post);
};

export const toggleLikePost = async (postId: string, userId: string) => {
  const postRef = doc(db, "posts", postId);
  const snap = await getDoc(postRef);
  if (snap.exists()) {
    const likes = snap.data().likes || [];
    if (likes.includes(userId)) await updateDoc(postRef, { likes: arrayRemove(userId) });
    else await updateDoc(postRef, { likes: arrayUnion(userId) });
  }
};

export const toggleBookmarkPost = async (postId: string, userId: string) => {
  const postRef = doc(db, "posts", postId);
  const snap = await getDoc(postRef);
  if (snap.exists()) {
    const bookmarks = snap.data().bookmarks || [];
    if (bookmarks.includes(userId)) await updateDoc(postRef, { bookmarks: arrayRemove(userId) });
    else await updateDoc(postRef, { bookmarks: arrayUnion(userId) });
  }
};

// ... existing Stories, Music, Chat functions (omitted for brevity, keep all) ...
export const activateSubscription = async (userId: string, planId: PlanType) => {
    const plan = getPlanDetails(planId);
    if (!plan) return;
    const subData: any = { plan: planId, startDate: Date.now(), expiryDate: calculateExpiry(plan.durationDays), isActive: true };
    await updateDoc(doc(db, "users", userId), { subscription: subData });
    return subData;
};

export const updatePremiumCustomization = async (userId: string, customization: PremiumCustomization) => {
    await updateDoc(doc(db, "users", userId), { premiumCustomization: customization });
};

export const admin_getStoreItems = async () => {
    const snap = await getDocs(collection(db, "store_items"));
    return snap.docs.map(d => d.data() as StoreItem);
};

export const admin_addStoreItem = async (item: Omit<StoreItem, 'id'>) => {
    const id = 'item_' + generateUUID();
    await setDoc(doc(db, "store_items", id), { ...item, id });
};

export const admin_deleteStoreItem = async (id: string) => {
    await deleteDoc(doc(db, "store_items", id));
};

export const admin_uploadSong = async (file: File, metadata: Omit<Song, 'id' | 'url'>) => {
  const songId = 'song_' + generateUUID();
  const storageRef = ref(storage, `songs/${songId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`);
  const meta = { contentType: file.type || 'audio/mpeg' };
  await uploadBytes(storageRef, file, meta);
  const downloadURL = await getDownloadURL(storageRef);
  const songData: Song = { id: songId, url: downloadURL, ...metadata, isActive: true };
  await setDoc(doc(db, "songs", songId), songData);
  return songData;
};

export const getMusicLibrary = async () => {
  const snapshot = await getDocs(query(collection(db, "songs"), where("isActive", "==", true)));
  return snapshot.docs.map(d => d.data() as Song);
};

export const admin_deleteSong = async (songId: string) => {
  await deleteDoc(doc(db, "songs", songId));
};

export const getAllUsers = async () => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => doc.data()).filter((u: any) => !u.isGloballyBlocked);
};

export const getUserById = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

export const subscribeToUser = (uid: string, callback: (user: any) => void) => {
  return onSnapshot(doc(db, "users", uid), (doc) => { if (doc.exists()) callback(doc.data()); });
};

export const setNickname = async (myUid: string, targetUid: string, nickname: string) => {
  if (!nickname.trim()) await deleteDoc(doc(db, "users", myUid, "nicknames", targetUid));
  else await setDoc(doc(db, "users", myUid, "nicknames", targetUid), { name: nickname });
};

export const subscribeToNicknames = (myUid: string, callback: (nicknames: Record<string, string>) => void) => {
  return onSnapshot(collection(db, "users", myUid, "nicknames"), (snapshot) => {
    const mapping: Record<string, string> = {};
    snapshot.forEach(doc => mapping[doc.id] = doc.data().name);
    callback(mapping);
  });
};

export const getMyChats = async (uid: string) => {
  const querySnapshot = await getDocs(collection(db, "chats"));
  return querySnapshot.docs.map(doc => doc.data()).filter((c: any) => c.participants && c.participants.includes(uid))
                 .sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

export const getMessages = async (chatId: string, viewingAsAdmin: boolean = false) => {
  const snapshot = await getDocs(collection(db, "messages"));
  const allMsgs = snapshot.docs.map(doc => doc.data());
  const currentUid = auth.currentUser?.uid;
  let filteredMsgs;
  if (chatId.startsWith('group_')) filteredMsgs = allMsgs.filter((m: any) => m.recipientId === chatId);
  else {
    const [u1, u2] = chatId.split('_');
    filteredMsgs = allMsgs.filter((m: any) => (m.senderId === u1 && m.recipientId === u2) || (m.senderId === u2 && m.recipientId === u1) || (m.recipientId === chatId));
  }
  if (currentUid && !viewingAsAdmin) filteredMsgs = filteredMsgs.filter((m: any) => !m.deletedFor?.includes(currentUid));
  return filteredMsgs.sort((a: any, b: any) => a.timestamp - b.timestamp);
};

export const addMessage = async (msg: any) => {
  const safeMsg = sanitizeData(msg);
  await setDoc(doc(db, "messages", safeMsg.id), safeMsg);
  if (safeMsg.type !== 'system') {
    const chatId = safeMsg.recipientId.startsWith('group_') ? safeMsg.recipientId : [safeMsg.senderId, safeMsg.recipientId].sort().join('_');
    await setDoc(doc(db, "chats", chatId), { 
      id: chatId, 
      lastMessage: { text: safeMsg.text || 'Media', senderId: safeMsg.senderId, timestamp: safeMsg.timestamp },
      updatedAt: safeMsg.timestamp,
      participants: safeMsg.recipientId.startsWith('group_') ? arrayUnion(safeMsg.senderId) : [safeMsg.senderId, safeMsg.recipientId]
    }, { merge: true });
  }
};

export const toggleMessageReaction = async (messageId: string, emoji: string, userId: string) => {
  const msgRef = doc(db, "messages", messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;
  const reactions = snap.data().reactions || {};
  const userList = reactions[emoji] || [];
  if (userList.includes(userId)) {
    reactions[emoji] = userList.filter((id: string) => id !== userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else reactions[emoji] = [...userList, userId];
  await updateDoc(msgRef, { reactions });
};

export const deleteMessageForEveryone = async (messageId: string) => {
    await updateDoc(doc(db, "messages", messageId), { type: 'deleted', text: '🚫 Deleted' });
};

export const deleteMessageForMe = async (messageId: string, userId: string) => {
    await updateDoc(doc(db, "messages", messageId), { deletedFor: arrayUnion(userId) });
};

export const setTypingStatus = async (chatId: string, userId: string, isTyping: boolean) => {
  await setDoc(doc(db, "chats", chatId), { typing: { [userId]: isTyping } }, { merge: true });
};

export const togglePinChat = async (userId: string, chatId: string) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const pinned = userSnap.data().pinnedChats || [];
        if (pinned.includes(chatId)) await updateDoc(userRef, { pinnedChats: arrayRemove(chatId) });
        else await updateDoc(userRef, { pinnedChats: arrayUnion(chatId) });
    }
};

export const togglePinMessage = async (chatId: string, messageId: string) => {
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);
    if(chatSnap.exists()) {
        const pinned = chatSnap.data().pinnedMessages || [];
        if(pinned.includes(messageId)) await updateDoc(chatRef, { pinnedMessages: arrayRemove(messageId) });
        else await updateDoc(chatRef, { pinnedMessages: arrayUnion(messageId) });
    }
};

export const subscribeToChat = (chatId: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, "chats", chatId), (doc) => { if (doc.exists()) callback(doc.data()); });
};

export const createGroup = async (name: string, participants: string[], adminId: string) => {
  const groupId = 'group_' + generateUUID();
  const newGroup = { id: groupId, type: 'group', name, participants: [...participants, adminId], adminIds: [adminId], updatedAt: Date.now() };
  await setDoc(doc(db, "chats", groupId), newGroup);
  return newGroup;
};

export const addMembersToGroup = async (chatId: string, newMemberIds: string[], adminName: string) => {
  await updateDoc(doc(db, "chats", chatId), { participants: arrayUnion(...newMemberIds) });
};

export const leaveGroup = async (chatId: string, userId: string) => {
  await updateDoc(doc(db, "chats", chatId), { participants: arrayRemove(userId), adminIds: arrayRemove(userId) });
};

export const removeGroupMember = async (chatId: string, userId: string) => {
  await updateDoc(doc(db, "chats", chatId), { participants: arrayRemove(userId), adminIds: arrayRemove(userId) });
};

export const makeGroupAdmin = async (chatId: string, userId: string) => {
  await updateDoc(doc(db, "chats", chatId), { adminIds: arrayUnion(userId) });
};

export const updateGroupInfo = async (chatId: string, name: string, iconUrl?: string, description?: string) => {
  const data: any = { name };
  if (iconUrl) data.groupIcon = iconUrl;
  if (description !== undefined) data.description = description;
  await updateDoc(doc(db, "chats", chatId), data);
};

export const toggleChatLock = async (chatId: string, userId: string) => {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (snap.exists()) {
    const lockedBy = snap.data().lockedBy || [];
    if (lockedBy.includes(userId)) await updateDoc(chatRef, { lockedBy: arrayRemove(userId) });
    else await updateDoc(chatRef, { lockedBy: arrayUnion(userId) });
  }
};

export const initiateCall = async (callerId: string, receiverId: string, type: 'voice' | 'video') => {
  const callId = 'call_' + generateUUID();
  const newCall = { id: callId, callerId, receiverId, type, status: 'ringing', timestamp: Date.now() };
  await setDoc(doc(db, "calls", callId), newCall);
  return newCall;
};

export const getIncomingCall = async (userId: string) => {
  const q = query(collection(db, "calls"), where("receiverId", "==", userId), where("status", "==", "ringing"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data()).sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
};

export const updateCallStatus = async (callId: string, status: string) => {
  await updateDoc(doc(db, "calls", callId), { status });
};

export const updateCallSignal = async (callId: string, data: any) => {
  await setDoc(doc(db, "calls", callId), data, { merge: true });
};

export const addIceCandidate = async (callId: string, candidate: any, type: 'caller' | 'callee') => {
  const field = type === 'caller' ? 'callerCandidates' : 'calleeCandidates';
  await updateDoc(doc(db, "calls", callId), { [field]: arrayUnion(sanitizeData(candidate)) });
};

export const subscribeToCall = (callId: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, "calls", callId), (doc) => { if (doc.exists()) callback(doc.data()); });
};

export const getCallById = async (callId: string) => {
  const snap = await getDoc(doc(db, "calls", callId));
  return snap.exists() ? snap.data() : null;
};

export const cleanOldCalls = async () => { };

export const addStory = async (story: any) => {
  await setDoc(doc(db, "stories", story.id), { ...story, likes: [], views: [] });
};
export const getStories = async () => {
  const yesterday = Date.now() - 86400000;
  const snapshot = await getDocs(query(collection(db, "stories"), where("timestamp", ">", yesterday)));
  return snapshot.docs.map(doc => doc.data());
};
export const viewStory = async (storyId: string, userId: string, userName: string) => {
  await updateDoc(doc(db, "stories", storyId), { views: arrayUnion({ userId, userName, timestamp: Date.now() }) });
};
export const likeStory = async (storyId: string, userId: string) => {
  const snap = await getDoc(doc(db, "stories", storyId));
  if(snap.exists()) {
    const likes = snap.data().likes || [];
    if(likes.includes(userId)) await updateDoc(doc(db, "stories", storyId), { likes: arrayRemove(userId) });
    else await updateDoc(doc(db, "stories", storyId), { likes: arrayUnion(userId) });
  }
};
export const deleteStory = async (storyId: string) => { await deleteDoc(doc(db, "stories", storyId)); };

export const sendStoryReply = async (rid: string, sid: string, text: string, story: any) => {
  const msg = { id: 'm_' + generateUUID(), senderId: sid, recipientId: rid, text, type: 'story_reply', timestamp: Date.now(), status: 'sent', storyContext: { storyId: story.id, mediaUrl: story.mediaUrl, mediaType: story.mediaType } };
  await addMessage(msg);
  return msg;
};

export const addNote = async (userId: string, userName: string, userPhoto: string, text: string, music?: any) => {
  const noteId = `note_${userId}`;
  const note = { id: noteId, userId, userName, userPhoto, text, timestamp: Date.now(), music };
  await setDoc(doc(db, "notes", noteId), note);
  return note;
};

export const getNotes = async () => {
  const yesterday = Date.now() - 86400000;
  const snapshot = await getDocs(query(collection(db, "notes"), where("timestamp", ">", yesterday)));
  return snapshot.docs.map(doc => doc.data());
};

export const sendNoteReply = async (rid: string, sid: string, text: string, note: any) => {
  const msg = { id: 'm_' + generateUUID(), senderId: sid, recipientId: rid, text, type: 'note_reply', timestamp: Date.now(), status: 'sent', noteContext: { noteId: note.id, text: note.text, userPhoto: note.userPhoto } };
  await addMessage(msg);
  return msg;
};

export const saveMediaToGallery = async (userId: string, mediaUrl: string, mediaType: 'image' | 'video', senderName: string) => {
  const id = 'saved_' + generateUUID();
  await setDoc(doc(db, "saved_media", id), { id, userId, mediaUrl, mediaType, savedAt: Date.now(), originalSenderName: senderName });
};

export const getSavedGallery = async (userId: string) => {
  const snapshot = await getDocs(query(collection(db, "saved_media"), where("userId", "==", userId)));
  return snapshot.docs.map(doc => doc.data()).sort((a: any, b: any) => b.savedAt - a.savedAt);
};

export const deleteSavedMedia = async (id: string) => { await deleteDoc(doc(db, "saved_media", id)); };

export const admin_getAllUsers = async () => getAllUsers();
export const admin_toggleAdminAccess = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
      const currentRole = snap.data().role || 'user';
      let newRole: UserRole = currentRole === 'user' ? 'admin' : currentRole === 'admin' ? 'co_admin' : 'user';
      if (snap.data().email === 'betterrroxx@gmail.com') return;
      await updateDoc(doc(db, "users", uid), { role: newRole, isAdmin: newRole !== 'user' });
  }
};
export const admin_toggleGlobalBlock = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) await updateDoc(doc(db, "users", uid), { isGloballyBlocked: !snap.data().isGloballyBlocked });
};
export const admin_deleteUser = async (uid: string) => { await deleteDoc(doc(db, "users", uid)); };
export const admin_getStats = async () => {
  const [u, m, c, s] = await Promise.all([getDocs(collection(db, "users")), getDocs(collection(db, "messages")), getDocs(collection(db, "chats")), getDocs(collection(db, "stories"))]);
  return { users: u.size, messages: m.size, chats: c.size, stories: s.size };
};
export const blockUser = async (myUid: string, targetUid: string) => { await updateDoc(doc(db, "users", myUid), { blockedUsers: arrayUnion(targetUid) }); };
export const unblockUser = async (myUid: string, targetUid: string) => { await updateDoc(doc(db, "users", myUid), { blockedUsers: arrayRemove(targetUid) }); };
