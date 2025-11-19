import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../lib/supabaseClient.js';

/**
 * Auth context for managing Supabase session and user across the app.
 * Listens to auth state changes and provides helper methods.
 * Gracefully handles missing Supabase envs by initializing with null session
 * and exposing auth methods that return friendly errors from authApi stubs.
 */

const AuthContext = createContext(null);

// PUBLIC_INTERFACE
export const useAuth = () => {
  /** Hook to access auth context */
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /**
   * Provides session and user from Supabase, and auth actions.
   * The provider initializes from Supabase and subscribes to updates.
   */
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    authApi
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          // eslint-disable-next-line no-console
          console.error('Error getting session', error);
        }
        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
      })
      .finally(() => isMounted && setInitializing(false));

    const { data: sub } = authApi.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      initializing,
      signIn: authApi.signInWithPassword,
      signUp: authApi.signUpWithPassword,
      signOut: authApi.signOut,
      featureFlags: {
        enableMicrosoftSSO:
          (process.env.REACT_APP_ENABLE_MICROSOFT_SSO || 'false').toLowerCase() === 'true',
      },
    }),
    [session, user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
