import { useState, useEffect, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../config/supabase';
import { getSignupEmailRedirectTo, handleSupabaseAuthDeepLink } from '../lib/authDeepLink';
import { isSignUpObfuscatedDuplicateUser } from '../utils/authErrors';
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
    let cancelled = false;
    let linkingSub: ReturnType<typeof Linking.addEventListener> | undefined;

    const applySession = async (session: Session | null) => {
      let profile: Profile | null = null;
      if (session?.user) {
        profile = await fetchProfile(session.user.id);
      }
      if (!cancelled) {
        setState({ session, profile, loading: false });
      }
    };

    /** Si l’event auth ne suit pas le deep link tout de suite (inscription, iPad…). */
    const refreshSessionFromStorage = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) {
          await applySession(data.session);
        }
      } catch {
        /* ignore */
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        queueMicrotask(() => {
          void applySession(session);
        });
      }
    );

    linkingSub = Linking.addEventListener('url', ({ url }) => {
      void (async () => {
        await handleSupabaseAuthDeepLink(url);
        await refreshSessionFromStorage();
      })();
    });

    void (async () => {
      const initial = await Linking.getInitialURL();
      if (cancelled || !initial) return;
      await handleSupabaseAuthDeepLink(initial);
      await refreshSessionFromStorage();
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      linkingSub?.remove();
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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      });
      if (error) return { error };

      const user = data?.user ?? null;
      const session = data?.session ?? null;
      if (user && !session && isSignUpObfuscatedDuplicateUser(user)) {
        return { error: { message: 'User already registered' } as { message: string } };
      }

      return { error: null };
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

  /**
   * Change le mot de passe de l’utilisateur connecté (code d’accès initial fourni par l’admin).
   * Vérifie d’abord l’ancien mot de passe en se ré-authentifiant.
   */
  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ error: string | null }> => {
    try {
      const email = state.session?.user?.email;
      if (!email) return { error: 'NO_SESSION' };

      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyErr) return { error: 'INVALID_CURRENT_PASSWORD' };

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.message ?? 'CHANGE_PASSWORD_FAILED' };
      return { error: null };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'CHANGE_PASSWORD_FAILED' };
    }
  };

  /**
   * Supprime définitivement le compte (Edge Function `delete-account`).
   * Exige la migration SQL `expenses_reviewed_by_on_delete_set_null.sql` et le déploiement de la fonction.
   */
  const deleteAccount = async (): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        'delete-account',
        { method: 'POST' }
      );
      if (error) {
        return { error: error.message ?? 'DELETE_ACCOUNT_FAILED' };
      }
      const payload = data as { ok?: boolean; error?: string } | null;
      if (payload?.error) {
        return { error: payload.error };
      }
      await supabase.auth.signOut();
      setState({ session: null, profile: null, loading: false });
      return { error: null };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'DELETE_ACCOUNT_FAILED' };
    }
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
    changePassword,
    deleteAccount,
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
