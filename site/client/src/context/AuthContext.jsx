import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from '../lib/firebase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined); // undefined = still checking
  const [profile, setProfile] = useState(null); // backend record: { unlocked, displayName, ... }
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    try {
      const data = await api.getMe();
      setProfile(data.user);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
    });
    return unsub;
  }, [refreshProfile]);

  const login = useCallback(async () => {
    setAuthError('');
    try {
      await signInWithGoogle();
      // onAuthStateChanged will pick up the new user and refresh the profile.
    } catch (err) {
      // Popup closed by user isn't a real error worth surfacing loudly.
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError('Could not sign in with Google. Please try again.');
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await signOutUser();
    setProfile(null);
  }, []);

  const value = {
    firebaseUser,
    profile,
    profileLoading,
    authError,
    login,
    logout,
    refreshProfile,
    isAuthLoading: firebaseUser === undefined,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
