import { useState, useEffect, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../config/supabase';
import { getSignupEmailRedirectTo, handleSupabaseAuthDeepLink } from '../lib/authDeepLink';
import { Profile, UserRole } from '../types';
import { hasCrmAccess, hasExpenseManagementAccess, hasFinanceTabAccess } from '../lib/roles';
import type { Session } from '@supabase/supabase-js';

const AUTH_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), ms);
    promise.then(
      v => {
        clearTimeout(t);
        resolve(v);
      },
      e => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: true,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    return data as Profile | null;
  }, []);

  useEffect(() => {
    const onUrl = ({ url }: { url: string }) => {
      void handleSupabaseAuthDeepLink(url);
    };
    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then(url => {
      if (url) void handleSupabaseAuthDeepLink(url);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (session: Session | null) => {
      let profile: Profile | null = null;
      if (session?.user) {
        profile = await fetchProfile(session.user.id);
      }
      if (!cancelled) {
        setState({ session, profile, loading: false });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Évite getSession() en parallèle : INITIAL_SESSION couvre le chargement initial.
        // Reporter le travail évite les courses sur le verrou GoTrue (recommandé SDK).
        queueMicrotask(() => {
          void applySession(session);
        });
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }) as Promise<{
          data: {
            user: { id: string } | null;
            session: Session | null;
          };
          error: { message: string } | null;
        }>,
        AUTH_TIMEOUT_MS
      );
      if (error) return { error };

      const userId = data.user?.id;
      const session = data.session;
      if (!userId || !session) {
        return {
          error: { message: 'EMAIL_OR_SESSION_MISSING' } as { message: string },
        };
      }

      const profileRes = await withTimeout(
        Promise.resolve(
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
        ) as Promise<{ data: Profile | null; error: { message?: string } | null }>,
        20_000
      );
      const { data: profileRow, error: profileError } = profileRes;

      if (profileError || !profileRow) {
        await supabase.auth.signOut();
        return { error: { message: 'PROFILE_MISSING' } as { message: string } };
      }

      setState({
        session,
        profile: profileRow as Profile,
        loading: false,
      });
      return { error: null };
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'REQUEST_TIMEOUT') {
        return { error: { message: 'REQUEST_TIMEOUT' } as { message: string } };
      }
      return {
        error: { message: e instanceof Error ? e.message : 'SIGNIN_FAILED' } as {
          message: string;
        },
      };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'employee') => {
    try {
      const emailRedirectTo = getSignupEmailRedirectTo();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      });
      return { error };
    } catch (e: unknown) {
      return {
        error: e instanceof Error ? e : new Error('Network or configuration error'),
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ session: null, profile: null, loading: false });
  };

  /** Suivi / validation des notes (Finance ou anciens « manager »). */
  const isAdmin = hasExpenseManagementAccess(state.profile?.role);

  /** CRM & Projets (commercial, finance, manager legacy). */
  const isCrmAccess = hasCrmAccess(state.profile?.role);

  /** Onglet Finance dédié (rôle finance uniquement). */
  const isFinanceTabAccess = hasFinanceTabAccess(state.profile?.role);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isCrmAccess,
    isFinanceTabAccess,
    refreshProfile: async () => {
      if (state.session?.user) {
        const profile = await fetchProfile(state.session.user.id);
        setState(prev => ({ ...prev, profile }));
      }
    },
  };
};
