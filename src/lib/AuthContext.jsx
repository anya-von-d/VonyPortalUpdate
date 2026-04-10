import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const AuthContext = createContext();

// Check if running as native app - safely handle when Capacitor isn't available
const isNativeApp = () => {
  try {
    if (typeof window !== 'undefined' && window.Capacitor) {
      return window.Capacitor.isNativePlatform();
    }
    return false;
  } catch {
    return false;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const authCheckInProgress = useRef(false);

  // Fetch full profile from profiles table
  const fetchUserProfile = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && profile) {
        setUserProfile(profile);
        return profile;
      }
    } catch (e) {
      console.log('Profile fetch error:', e);
    }
    return null;
  };

  const checkUserAuth = async () => {
    // Prevent duplicate auth checks
    if (authCheckInProgress.current) return;
    authCheckInProgress.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        setUserProfile(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        authCheckInProgress.current = false;
        return;
      }

      setUser(session.user);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);

      // Fetch profile in background
      fetchUserProfile(session.user.id);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
    }
    authCheckInProgress.current = false;
  };

  useEffect(() => {
    // Handle OAuth callback tokens in URL (for web)
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        console.log('Found tokens in URL hash, setting session...');
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    const init = async () => {
      await handleOAuthCallback();
      await checkUserAuth();
    };

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setIsAuthenticated(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        fetchUserProfile(session.user.id);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }
    });

    // Listen for deep link OAuth callbacks (native mobile)
    let appUrlListener;
    if (isNativeApp()) {
      appUrlListener = CapApp.addListener('appUrlOpen', async ({ url }) => {
        console.log('App URL opened:', url);
        // Handle OAuth callback deep link: com.vony.lend://auth/callback#access_token=...
        if (url.includes('auth/callback')) {
          const hashPart = url.split('#')[1];
          if (hashPart) {
            const params = new URLSearchParams(hashPart);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            if (accessToken && refreshToken) {
              console.log('Native OAuth callback: setting session...');
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              // Close the browser that was opened for OAuth
              try { await Browser.close(); } catch (e) { /* already closed */ }
            }
          }
        }
      });
    }

    return () => {
      subscription?.unsubscribe();
      if (appUrlListener) {
        appUrlListener.then(l => l.remove());
      }
    };
  }, []);

  // Listen for profile updates from Profile page
  useEffect(() => {
    const handleProfileUpdated = () => {
      if (user?.id) {
        fetchUserProfile(user.id);
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdated);
    };
  }, [user?.id]);

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id);
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    await supabase.auth.signOut();
    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = async () => {
    try {
      if (isNativeApp()) {
        // Native mobile: Open OAuth in system browser with deep link redirect
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.vony.lend://auth/callback',
            skipBrowserRedirect: true,
          }
        });

        if (error) {
          console.error('OAuth error:', error);
          throw error;
        }

        // Open the OAuth URL in the system browser
        if (data?.url) {
          await Browser.open({ url: data.url });
        }
      } else {
        // Web: Normal OAuth redirect
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });

        if (error) {
          console.error('OAuth error:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      isAuthenticated,
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin,
      checkUserAuth,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
