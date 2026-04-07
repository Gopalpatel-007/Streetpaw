import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, User, db, doc, getDoc, setDoc } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  loginAsAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false,
  loginAsAdmin: () => false,
  logoutAdmin: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('streetpaws_admin_session') === 'true';
  });

  const loginAsAdmin = (password: string) => {
    if (password === 'admingopal@2026') {
      setIsAdmin(true);
      localStorage.setItem('streetpaws_admin_session', 'true');
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
    localStorage.removeItem('streetpaws_admin_session');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          // Check if user exists in Firestore, if not create profile
          const userRef = doc(db, 'users', currentUser.uid);
          
          try {
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
              const newUser = {
                displayName: currentUser.displayName || 'Anonymous',
                email: currentUser.email || '',
                photoURL: currentUser.photoURL || '',
                role: 'user'
              };
              await setDoc(userRef, newUser);
              // Don't override manual admin session if it exists
              if (localStorage.getItem('streetpaws_admin_session') !== 'true') {
                setIsAdmin(false);
              }
            } else {
              const isDbAdmin = userSnap.data().role === 'admin' || currentUser.email === 'gopalpatelpatel693@gmail.com';
              if (isDbAdmin) {
                setIsAdmin(true);
                localStorage.setItem('streetpaws_admin_session', 'true');
              } else if (localStorage.getItem('streetpaws_admin_session') !== 'true') {
                setIsAdmin(false);
              }
            }
          } catch (dbError: any) {
            console.error("Firestore Auth Check Error:", dbError);
            const isHardcodedAdmin = currentUser.email === 'gopalpatelpatel693@gmail.com';
            if (isHardcodedAdmin) {
              setIsAdmin(true);
              localStorage.setItem('streetpaws_admin_session', 'true');
            } else if (localStorage.getItem('streetpaws_admin_session') !== 'true') {
              setIsAdmin(false);
            }
          }
        } else {
          // If logged out from Firebase, we might still want to keep the manual admin session?
          // Actually, usually admin should be logged in via Google too, but let's allow manual admin session to persist or not.
          // The user said "admin login features", so maybe they want to login as admin WITHOUT Google?
          // But our system is built around Google login.
          // Let's just keep the manual admin session separate.
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, loginAsAdmin, logoutAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
