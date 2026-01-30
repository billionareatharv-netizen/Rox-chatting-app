
import { useState, useEffect } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  updateProfile,
  updateUserStatus,
  getUserById,
  makeUserAdmin,
  observeAuthState,
  db
} from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { User, UserRole } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    let mounted = true;
    let userUnsub: (() => void) | null = null;

    const unsubscribe = observeAuthState(async (firebaseUser: any) => {
        if (!mounted) return;

        if (firebaseUser) {
            // Subscribe to real-time updates of the user document
            userUnsub = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const dbUser = docSnap.data();
                    
                    // --- FOUNDER LOGIC ---
                    const email = firebaseUser.email?.toLowerCase();
                    const isFounderEmail = email === 'betterrroxx@gmail.com';
                    let finalRole: UserRole = 'user';
                    let isAdmin = false;

                    if (isFounderEmail) {
                        finalRole = 'owner';
                        isAdmin = true;
                        // Ensure DB stays in sync for Founder (Background check)
                        if (dbUser.role !== 'owner' || !dbUser.isAdmin) {
                            makeUserAdmin(firebaseUser.uid, 'owner');
                        }
                    } else {
                        finalRole = dbUser.role || (dbUser.isAdmin ? 'admin' : 'user');
                        isAdmin = dbUser.isAdmin || false;
                    }

                    const finalUser: User = {
                        uid: firebaseUser.uid,
                        name: dbUser.name || firebaseUser.displayName || 'Anonymous',
                        email: firebaseUser.email || '',
                        photoURL: dbUser.photoURL || firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/200`,
                        status: dbUser.status || 'online',
                        lastSeen: dbUser.lastSeen || Date.now(),
                        bio: dbUser.bio,
                        blockedUsers: dbUser.blockedUsers || [],
                        chatLockPassword: dbUser.chatLockPassword,
                        isAdmin: isAdmin,
                        role: finalRole,
                        isGloballyBlocked: !!dbUser.isGloballyBlocked,
                        privacySettings: dbUser.privacySettings,
                        pinnedChats: dbUser.pinnedChats || [],
                        subscription: dbUser.subscription,
                        premiumCustomization: dbUser.premiumCustomization,
                        username: dbUser.username,
                        security: dbUser.security,
                        wallpapers: dbUser.wallpapers || {}
                    };
                    setUser(finalUser);
                } else {
                    // Fallback if doc doesn't exist yet
                    setUser({
                        uid: firebaseUser.uid,
                        name: firebaseUser.displayName || 'User',
                        email: firebaseUser.email || '',
                        photoURL: firebaseUser.photoURL || '',
                        status: 'online',
                        lastSeen: Date.now(),
                        isAdmin: false,
                        role: 'user'
                    } as User);
                }
                setLoading(false);
            }, (error) => {
                console.error("User snapshot error:", error);
                setLoading(false);
            });
        } else {
            if (userUnsub) userUnsub();
            setUser(null);
            setLoading(false);
        }
    });

    return () => {
      mounted = false;
      if (userUnsub) userUnsub();
      unsubscribe();
    };
  }, []);

  // Presence System
  useEffect(() => {
    if (!user?.uid) return;

    const uid = user.uid;

    // Set online immediately on mount
    updateUserStatus(uid, 'online');

    // Heartbeat to keep status online/update lastSeen
    const heartbeat = setInterval(() => {
        if (document.visibilityState === 'visible') {
            updateUserStatus(uid, 'online');
        }
    }, 60000);

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            updateUserStatus(uid, 'offline');
        } else {
            updateUserStatus(uid, 'online');
        }
    };

    // Before unload is the last chance to set offline on close
    const handleBeforeUnload = () => {
        updateUserStatus(uid, 'offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        clearInterval(heartbeat);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        // Attempt to set offline on component unmount (logout)
        updateUserStatus(uid, 'offline');
    };
  }, [user?.uid]);

  const signup = async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    const updated = await updateProfile(res.user, { 
      displayName: name,
      name: name,
      photoURL: `https://picsum.photos/seed/${res.user.uid}/200`
    });
    return updated;
  };

  const login = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return res.user;
  };

  const googleSignIn = async () => {
    const res = await signInWithPopup();
    return res.user;
  };

  const logout = async () => {
    if (user?.uid) await updateUserStatus(user.uid, 'offline');
    await signOut();
  };

  return { user, loading, signup, login, googleSignIn, logout };
};
