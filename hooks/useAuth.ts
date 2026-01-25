
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
  observeAuthState
} from '../firebase';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    let mounted = true;

    const timeoutTimer = setTimeout(() => {
        if (mounted && loading) {
            console.warn("Auth listener timed out. Defaulting to logged out state.");
            setLoading(false);
        }
    }, 4000);

    const unsubscribe = observeAuthState(async (firebaseUser: any) => {
        clearTimeout(timeoutTimer); 
        if (!mounted) return;

        if (firebaseUser) {
            try {
              let dbUser = await getUserById(firebaseUser.uid);
              
              const isHardcodedAdmin = firebaseUser.email?.toLowerCase() === 'betterrroxx@gmail.com';
              if (isHardcodedAdmin) {
                 if (dbUser && !dbUser.isAdmin) {
                    await makeUserAdmin(firebaseUser.uid);
                    dbUser.isAdmin = true;
                 }
              }

              const finalUser: User = {
                uid: firebaseUser.uid,
                name: dbUser?.name || firebaseUser.displayName || 'Anonymous',
                email: firebaseUser.email || '',
                photoURL: dbUser?.photoURL || firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/200`,
                status: dbUser?.status || 'online',
                lastSeen: dbUser?.lastSeen || Date.now(),
                bio: dbUser?.bio,
                blockedUsers: dbUser?.blockedUsers || [],
                chatLockPassword: dbUser?.chatLockPassword,
                isAdmin: dbUser ? !!dbUser.isAdmin : isHardcodedAdmin,
                role: dbUser?.role || (isHardcodedAdmin ? 'owner' : 'user'),
                isGloballyBlocked: !!dbUser?.isGloballyBlocked,
                privacySettings: dbUser?.privacySettings,
                pinnedChats: dbUser?.pinnedChats || [],
                subscription: dbUser?.subscription,
                premiumCustomization: dbUser?.premiumCustomization,
                username: dbUser?.username,
                security: dbUser?.security
              };
              
              setUser(finalUser);
            } catch (err) {
              console.error("Error fetching user details:", err);
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
        } else {
            setUser(null);
        }
        setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutTimer);
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
