import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, User, db, doc, getDoc, setDoc } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
              setIsAdmin(false);
            } else {
              setIsAdmin(userSnap.data().role === 'admin' || currentUser.email === 'gopalpatelpatel693@gmail.com');
            }
          } catch (dbError: any) {
            // Optimization: If Firestore is blocked by quota, still allow the user to be "logged in"
            // based on Firebase Auth, but default to non-admin role.
            console.warn("Firestore access failed during auth check (likely quota). Defaulting to guest profile.");
            setIsAdmin(currentUser.email === 'gopalpatelpatel693@gmail.com'); // Hardcoded admin check as fallback
          }
        } else {
          setIsAdmin(false);
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
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
