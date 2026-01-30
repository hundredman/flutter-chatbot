import React, { useState, useEffect } from 'react';
import './App.css';
import AuthPage from './components/AuthPage';
import ChatLayout from './components/ChatLayout';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { signOutUser } from './firebase/authService';

function App() {
  // Debug: Check environment variable at app startup
  console.log('[App] Environment check:', {
    VITE_CLOUDFLARE_WORKER_URL: import.meta.env.VITE_CLOUDFLARE_WORKER_URL,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD
  });

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState(() => {
    // Load language preference from localStorage
    return localStorage.getItem('language') || 'en';
  });

  // Save language preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        // User is signed out
        setUser(null);
        localStorage.removeItem('user');
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);


  const handleSignOut = async () => {
    try {
      await signOutUser();
      // onAuthStateChanged will handle the state updates
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <div className="App">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        <ChatLayout user={user} onSignOut={handleSignOut} language={language} onLanguageChange={setLanguage} />
      ) : (
        <AuthPage language={language} onLanguageChange={setLanguage} />
      )}
    </div>
  );
}

export default App;