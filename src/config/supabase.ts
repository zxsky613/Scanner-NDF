import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { authStorage } from '../lib/authStorage';
import { supabaseFetch } from '../lib/supabaseFetch';

/**
 * Préférez un fichier `.env` à la racine du projet (non versionné) :
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=<clé anon JWT du tableau Project Settings → API>
 *
 * UNIQUEMENT la clé « anon » / « public » (JWT, rôle `anon` dans le payload — pas `service_role`).
 */
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://tqvxwthzpahwcscpwyrr.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxdnh3dGh6cGFod2NzY3B3eXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjA5NDksImV4cCI6MjA5MTEzNjk0OX0.BvB2cFoqC8xaDKWCG-f7mKejAKYwQTJGtrJWR0y3974';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: supabaseFetch },
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    /* Password login : évite des blocages PKCE / hash sur le web */
    detectSessionInUrl: false,
    flowType: 'implicit',
    /**
     * Sur iOS/Android, forcer un verrou in-process évite les courses avec
     * l’API Web Locks (vol de verrou / "steal") si l’environnement expose
     * `navigator.locks`. Sur le web, on garde le défaut (coordination multi-onglets).
     */
    ...(Platform.OS !== 'web' ? { lock: processLock } : {}),
  },
});
