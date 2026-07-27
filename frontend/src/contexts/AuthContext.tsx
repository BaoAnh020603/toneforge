import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        let role = 'user';
        let isVip = false;
        
        if (currentUser.email === 'trongandev25@gmail.com') {
           role = 'admin';
           isVip = true;
        }

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            role,
            isVip,
            createdAt: serverTimestamp(),
          });
        } else {
             // For existing but missing role
             const data = userSnap.data();
             const updates: any = {};
             if (currentUser.email === 'trongandev25@gmail.com' && (data.role !== 'admin' || !data.isVip)) {
                 updates.role = 'admin';
                 updates.isVip = true;
             }
             if (!data.email && currentUser.email) updates.email = currentUser.email;
             if (!data.displayName && currentUser.displayName) updates.displayName = currentUser.displayName;
             if (!data.photoURL && currentUser.photoURL) updates.photoURL = currentUser.photoURL;
             
             if (Object.keys(updates).length > 0) {
                 await setDoc(userRef, updates, { merge: true });
             }
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
