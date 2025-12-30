
import { useState, useEffect } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  updateProfile,
} from '../firebase';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to mock auth state changes
    const unsubscribe = auth.onAuthStateChanged((mockUser: any) => {
      if (mockUser) {
        // Ensure all properties including admin flags are passed through
        const finalUser: User = {
          uid: mockUser.uid,
          name: mockUser.name || mockUser.displayName || 'Anonymous',
          email: mockUser.email || '',
          photoURL: mockUser.photoURL || `https://picsum.photos/seed/${mockUser.uid}/200`,
          status: mockUser.status || 'online',
          lastSeen: mockUser.lastSeen || Date.now(),
          bio: mockUser.bio,
          blockedUsers: mockUser.blockedUsers || [],
          chatLockPassword: mockUser.chatLockPassword,
          isAdmin: !!mockUser.isAdmin,
          isGloballyBlocked: !!mockUser.isGloballyBlocked
        };
        setUser(finalUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    await signOut();
  };

  return { user, loading, signup, login, googleSignIn, logout };
};
