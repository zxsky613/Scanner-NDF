import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../config/supabase';

/**
 * URL de retour après confirmation e-mail (native : ouvre l’app sur le flux auth).
 * À autoriser dans Supabase : Authentication → URL Configuration → Redirect URLs :
 *   dabars://**
 *   (dev Expo Go) exp://**  ou l’URL exacte affichée par createURL
 */
export function getSignupEmailRedirectTo(): string | undefined {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/`;
    }
    return undefined;
  }
  return Linking.createURL('login');
}

function parseAuthFragment(url: string): { access_token: string; refresh_token: string } | null {
  const hashIdx = url.indexOf('#');
  const fragment = hashIdx !== -1 ? url.slice(hashIdx + 1) : '';
  if (fragment) {
    if (fragment.includes('error=')) return null;
    const p = new URLSearchParams(fragment);
    const access_token = p.get('access_token') ?? '';
    const refresh_token = p.get('refresh_token') ?? '';
    if (access_token) return { access_token, refresh_token };
  }
  const qIdx = url.indexOf('?');
  if (qIdx !== -1) {
    const query = url.slice(qIdx + 1).split('#')[0];
    const p = new URLSearchParams(query);
    const access_token = p.get('access_token') ?? '';
    const refresh_token = p.get('refresh_token') ?? '';
    if (access_token) return { access_token, refresh_token };
  }
  return null;
}

/** Appelé au cold start et sur lien entrant : établit la session après le mail Supabase. */
export async function handleSupabaseAuthDeepLink(url: string): Promise<void> {
  if (!url) return;
  const lower = url.toLowerCase();
  if (!lower.includes('access_token') && !lower.includes('refresh_token')) {
    return;
  }
  const tokens = parseAuthFragment(url);
  if (!tokens) return;
  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error && __DEV__) {
    console.warn('[auth deep link] setSession:', error.message);
  }
}
