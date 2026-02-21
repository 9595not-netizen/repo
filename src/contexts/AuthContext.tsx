import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type UserRole = 'admin' | 'staff';

type UserProfile = Database['public']['Tables']['users']['Row'];

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingUserIdRef = useRef<string | null>(null);

  const fetchUserProfile = useCallback(async (userId: string, userEmail?: string, retryCount = 0) => {
    if (retryCount === 0) fetchingUserIdRef.current = userId;
    const PROFILE_TIMEOUT_MS = 4000;
    const MAX_RETRIES = 1;

    const doFetch = async () => {
      const profilePromise = supabase.from('users').select('*').eq('id', userId).maybeSingle();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), PROFILE_TIMEOUT_MS)
      );
      return Promise.race([profilePromise, timeoutPromise]);
    };

    try {
      const result = await doFetch();
      let { data, error } = result as { data: UserProfile | null; error: { message?: string } | null };

      if ((error || !data) && userEmail?.trim()) {
        const fallback = await supabase
          .from('users')
          .select('*')
          .eq('email', userEmail.trim())
          .eq('status', 'active')
          .maybeSingle();
        if (!fallback.error && fallback.data) {
          data = fallback.data as UserProfile;
          error = null;
        }
      }

      if (error && retryCount < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500));
        return fetchUserProfile(userId, userEmail, retryCount + 1);
      }

      if (error) {
        console.error('Error fetching user profile:', error);
        // ไม่เคลียร์ userProfile เมื่อ fetch ล้มเหลว - เก็บข้อมูลเดิมเพื่อไม่ให้ UI กระพริบกลับไป Staff
      } else if (data) {
        if (fetchingUserIdRef.current === userId) setUserProfile(data);
      } else {
        if (fetchingUserIdRef.current === userId) setUserProfile(null);
      }
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500));
        return fetchUserProfile(userId, userEmail, retryCount + 1);
      }
      if ((err as Error)?.message !== 'Profile fetch timeout') {
        console.error('Unexpected error fetching profile:', err);
      }
      // ไม่เคลียร์ userProfile เมื่อเกิด exception - เก็บข้อมูลเดิม
    } finally {
      setLoading(false);
    }
  }, []);

  // Check session on mount
  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserProfile(session.user.id, session.user.email ?? undefined);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (!cancelled) setLoading(false);
      }
    };

    initAuth();

    const timeoutId = setTimeout(() => {
      setLoading((prev) => (prev ? false : prev));
    }, 5000);

    // Listen for auth state changes (รวมถึง auto logout เมื่อ session หมดอายุ / SIGNED_OUT)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // ถ้าเป็นคนละคน ให้เคลียร์ profile ก่อน (กรณีสลับผู้ใช้)
        setUserProfile((prev) => {
          if (prev && prev.id !== session.user.id) return null;
          return prev;
        });
        await fetchUserProfile(session.user.id, session.user.email ?? undefined);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const role = userProfile?.role as UserRole | null;
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';

  const value: AuthContextType = {
    session,
    user,
    role,
    userProfile,
    loading,
    signOut,
    signIn,
    isAdmin,
    isStaff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
