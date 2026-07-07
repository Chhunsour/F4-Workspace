import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  // Loud in dev, harmless in prod (client still constructed with empty strings).
  console.warn('[uni-life] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. See .env.example.')
}

// Untyped client on purpose: hand-authored Database generics fought supabase-js's
// GenericSchema and resolved inserts to `never`. Domain types are enforced at call
// sites via explicit `as X` casts in the stores instead. ponytail: not worth the churn.
export const supabase = createClient(url ?? '', anon ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 5 } },
})

export const STORAGE_BUCKETS = {
  avatars:  'avatars',
  memories: 'memories',
} as const

export function publicUrl(bucket: keyof typeof STORAGE_BUCKETS, path: string) {
  return supabase.storage.from(STORAGE_BUCKETS[bucket]).getPublicUrl(path).data.publicUrl
}
