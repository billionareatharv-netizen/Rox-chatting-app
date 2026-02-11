import { useState, useEffect } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  updateProfile,
  updateUserStatus,
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

    // Safety timeout to ensure loading eventually finishes
    const safetyTimer = setTimeout(() => {
        if (mounted && loading) {
            console.warn("Auth synchronization taking too long, forcing load completion.");
            setLoading(false);
        }
    }, 8000);

    const unsubscribe = observeAuthState(async (firebaseUser: any) => {
        if (!mounted) return;

        if (firebaseUser && db) {
            // Subscribe to real-time updates of the user document
            try {
              userUnsub = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
                  if (!mounted) return;
                  
                  if (docSnap.exists()) {
                      const dbUser = docSnap.data();
                      
                      const email = firebaseUser.email?.toLowerCase();
                      const isFounderEmail = email === 'betterrroxx@gmail.com';
                      let finalRole: UserRole = dbUser.role || 'user';
                      let isAdmin = dbUser.isAdmin || false;

                      if (isFounderEmail) {
                          finalRole = 'owner';
                          isAdmin = true;
                          if (dbUser.role !== 'owner' || !dbUser.isAdmin) {
                              makeUserAdmin(firebaseUser.uid, 'owner').catch(console.error);
                          }
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
                      // Initial fallback for newly created users
                      setUser({
                          uid: firebaseUser.uid,
                          name: firebaseUser.displayName || 'User',
                          email: firebaseUser.email || '',
                          photoURL: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/200`,
                          status: 'online',
                          lastSeen: Date.now(),
                          isAdmin: firebaseUser.email?.toLowerCase() === 'betterrroxx@gmail.com',
                          role: firebaseUser.email?.toLowerCase() === 'betterrroxx@gmail.com' ? 'owner' : 'user'
                      } as User);
                  }
                  setLoading(false);
                  clearTimeout(safetyTimer);
              }, (error) => {
                  console.error("Firestore snapshot error:", error);
                  // Auth exists but profile fetch failed, allow access anyway
                  setLoading(false);
                  clearTimeout(safetyTimer);
              });
            } catch (e) {
               console.error("Auth initialization failed:", e);
               setLoading(false);
               clearTimeout(safetyTimer);
            }
        } else {
            if (userUnsub) userUnsub();
            setUser(null);
            setLoading(false);
            clearTimeout(safetyTimer);
        }
    });

    return () => {
      mounted = false;
      if (userUnsub) userUnsub();
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  // Presence System
  useEffect(() => {
    if (!user?.uid || !db) return;
    const uid = user.uid;
    updateUserStatus(uid, 'online').catch(() => {});

    const heartbeat = setInterval(() => {
        if (document.visibilityState === 'visible') {
            updateUserStatus(uid, 'online').catch(() => {});
        }
    }, 60000);

    const handleVisibility = () => {
        updateUserStatus(uid, document.visibilityState === 'hidden' ? 'offline' : 'online').catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
        clearInterval(heartbeat);
        document.removeEventListener('visibilitychange', handleVisibility);
        updateUserStatus(uid, 'offline').catch(() => {});
    };
  }, [user?.uid]);

  const signup = async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(res.user, { 
      displayName: name,
      photoURL: `https://picsum.photos/seed/${res.user.uid}/200`
    });
    return res;
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