import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseClient, hasSupabase } from "@/lib/supabaseClient";

interface AuthContextValue {
  session: Session | null;
  // accepts either username or email; if a username is provided it will be mapped to username@local.invalid
  signIn: (identifier: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase || !supabaseClient) {
      // No supabase configured: use a simple fallback anonymous session
      setSession(null);
      setLoading(false);
      return;
    }

    const s = supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (identifier: string, password: string) => {
    if (!hasSupabase || !supabaseClient) return Promise.reject(new Error("Supabase not configured"));
    const email = identifier.includes("@") ? identifier : `${identifier}@local.invalid`;
    try {
      const res = await supabaseClient.auth.signInWithPassword({ email, password });
      if (res.error) {
        const msg = String(res.error?.message || res.error);
        if (msg.toLowerCase().includes('email logins are disabled') || msg.toLowerCase().includes('email logins are disabled')) {
          throw new Error('El inicio de sesión por email está deshabilitado en Supabase. Habilítalo en Authentication → Settings o conecta otro método.');
        }
        throw res.error;
      }
      return res;
    } catch (e: any) {
      // rethrow for the UI to display
      throw e;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!hasSupabase || !supabaseClient) return Promise.reject(new Error("Supabase not configured"));
    const res = await supabaseClient.auth.signUp({ email, password });
    if (res.error) throw res.error;

    // attempt to auto-confirm via server-side admin endpoint
    try {
      await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (e) {
      // ignore errors here
      console.warn('auto-confirm failed', e);
    }

    return res;
  };

  const resetPassword = async (email: string) => {
    if (!hasSupabase || !supabaseClient) return Promise.reject(new Error("Supabase not configured"));
    const res = await supabaseClient.auth.resetPasswordForEmail(email);
    if (res.error) throw res.error;
    return res;
  };

  const signOut = async () => {
    if (!hasSupabase || !supabaseClient) return;
    await supabaseClient.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signOut, loading, signUp, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
