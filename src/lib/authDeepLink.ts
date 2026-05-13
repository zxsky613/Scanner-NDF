import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../config/supabase';

/** Types de `type=` acceptés avec `token_hash=` (lien e-mail Supabase). */
const EMAIL_CONFIRM_TYPES = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
] as const;
type EmailConfirmType = (typeof EMAIL_CONFIRM_TYPES)[number];

function isEmailConfirmType(raw: string): raw is EmailConfirmType {
  return (EMAIL_CONFIRM_TYPES as readonly string[]).includes(raw);
}

/** Erreurs GoTrue renvoyées dans l’URL (fragment ou query). */
function urlIndicatesAuthFailure(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('error=') || lower.includes('error_code=');
}

function foreachUrlParamSegments(url: string, fn: (params: URLSearchParams) => void): void {
  const qi = url.indexOf('?');
  if (qi !== -1) {
    fn(new URLSearchParams(url.slice(qi + 1).split('#')[0]));
  }
  const hi = url.indexOf('#');
  if (hi !== -1) {
    fn(new URLSearchParams(url.slice(hi + 1)));
  }
}

/** Lien de confirmation utilisant token_hash + type (parfois à la place de code / fragments JWT). */
function parseTokenHashOtp(url: string): { token_hash: string; type: EmailConfirmType } | null {
  let found: { token_hash: string; type: EmailConfirmType } | null = null;
  foreachUrlParamSegments(url, params => {
    if (found) return;
    const token_hash = params.get('token_hash')?.trim();
    const rawType = params.get('type')?.trim() ?? '';
    if (!token_hash || !isEmailConfirmType(rawType)) return;
    found = { token_hash, type: rawType };
  });
  return found;
}

/**
 * URL de retour après confirmation e-mail (native : ouvre l’app sur le flux auth).
 * À autoriser dans Supabase : Authentication → URL Configuration → Redirect URLs :
 *   dabars://**
 *   + l’URL exacte renvoyée par `Linking.createURL('login')` en build production
 *   (souvent dabars:///login — les trois slashs comptent dans l’allow-list).
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

/** Lien de confirmation Supabase en PKCE : ?code=... ou #code=... */
function parsePkceAuthCode(url: string): string | null {
  const fromSegment = (segment: string): string | null => {
    const trimmed = segment.startsWith('?') ? segment.slice(1) : segment;
    const p = new URLSearchParams(trimmed);
    const code = p.get('code')?.trim();
    return code?.length ? code : null;
  };
  const hashIdx = url.indexOf('#');
  if (hashIdx !== -1) {
    const fragment = url.slice(hashIdx + 1);
    const c = fromSegment(fragment);
    if (c) return c;
  }
  const qIdx = url.indexOf('?');
  if (qIdx !== -1) {
    const queryPart = url.slice(qIdx + 1).split('#')[0];
    const c = fromSegment(queryPart);
    if (c) return c;
  }
  return null;
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

  if (urlIndicatesAuthFailure(url)) {
    if (__DEV__) {
      console.warn('[auth deep link] URL contient une erreur auth ; abandon.');
    }
    return;
  }

  const tokenHashOtp = parseTokenHashOtp(url);
  if (tokenHashOtp) {
    const { error } = await supabase.auth.verifyOtp(tokenHashOtp);
    if (!error) return;
    if (__DEV__) {
      console.warn('[auth deep link] verifyOtp:', error.message);
    }
  }

  const pkceCode = parsePkceAuthCode(url);
  if (pkceCode) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode);
    if (!error && data.session) return;
    if (error && __DEV__) {
      console.warn('[auth deep link] exchangeCodeForSession:', error.message);
    }
  }

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
