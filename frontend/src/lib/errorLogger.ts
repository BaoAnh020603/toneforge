import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const logErrorToFirebase = async (error: Error, info?: any, context?: string) => {
  try {
    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack || '',
      info: info ? JSON.stringify(info) : null,
      context: context || 'Global',
      timestamp: serverTimestamp(),
      userId: auth?.currentUser?.uid || 'Anonymous',
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    await addDoc(collection(db, 'errorLogs'), errorData);
    console.log("Error logged to Firebase:", error.message);
  } catch (e) {
    console.error("Failed to log error to Firebase:", e);
  }
};
