import { defineStore } from 'pinia'
import { supabase, STORAGE_BUCKETS, publicUrl } from '@/lib/supabase'
import type { Profile } from '@/types'
import { compressImage } from '@/lib/utils'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    userId: null as string | null,
    email: null as string | null,
    profile: null as Profile | null,
    loading: true,
    ready: false,
  }),
  getters: {
    isSignedIn: (s) => !!s.userId,
    displayName: (s) => s.profile?.full_name || s.email?.split('@')[0] || 'Student',
    firstName(): string {
      const n = this.profile?.full_name?.trim() || ''
      return n.split(/\s+/)[0] || (this.email?.split('@')[0] ?? 'Student')
    },
    avatarPublicUrl(): string | null {
      if (!this.profile?.avatar_url) return null
      // stored as bucket-relative path
      return publicUrl('avatars', this.profile.avatar_url)
    },
  },
  actions: {
    async init() {
      if (this.ready) return   // idempotent — main.ts calls this once, but be safe
      this.loading = true

      // Register the auth listener FIRST so we don't miss INITIAL_SESSION or
      // a token refresh that fires during the initial getSession() call.
      //
      // Handle events explicitly. The previous version blindly did
      //   this.userId = session?.user?.id ?? null
      // for every event, which silently signed the user out on any transient
      // event that carried a nullish session (mid-refresh callback, spurious
      // re-emit, storage read hiccup). That is the source of the "randomly
      // kicked to /sign-in during navigation" bug.
      //
      // Rule: ONLY SIGNED_OUT clears userId. Every other event may SET userId
      // from a valid session but never clears it. If a session is truly gone,
      // supabase-js fires SIGNED_OUT — trust that as the signal.
      //
      // IMPORTANT: never await Supabase DB calls *inside* this callback —
      // supabase-js holds the auth lock while it runs and a query that needs
      // the token would deadlock. Defer profile reload with setTimeout.
      supabase.auth.onAuthStateChange((event, session) => {
        if (import.meta.env.DEV) {
          console.debug('[auth]', event, session?.user?.id ? 'user=' + session.user.id.slice(0, 8) : 'no-user')
        }
        switch (event) {
          case 'SIGNED_OUT': {
            this.userId = null
            this.email  = null
            this.profile = null
            return
          }
          case 'SIGNED_IN':
          case 'INITIAL_SESSION':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED': {
            if (!session?.user) return   // no session on these events => leave state alone
            this.userId = session.user.id
            this.email  = session.user.email ?? null
            // Only reload the profile when it might have actually changed.
            // TOKEN_REFRESHED doesn't touch the profile row, so skip it.
            const needsProfile = !this.profile || event === 'USER_UPDATED' || event === 'SIGNED_IN'
            if (needsProfile) setTimeout(() => { this.loadProfile().catch(() => {}) }, 0)
            return
          }
          case 'PASSWORD_RECOVERY':
            // Session is scoped to the recovery flow; don't touch app state.
            return
          default:
            return
        }
      })

      // Eager restore so the very first router guard sees fresh state without
      // waiting on the listener's INITIAL_SESSION callback. Profile load is
      // best-effort in the background — the Supabase session is the source
      // of truth, the profile row is just metadata. A failed profile fetch
      // must NEVER sign the user out.
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          this.userId = session.user.id
          this.email  = session.user.email ?? null
          this.loadProfile().catch(() => {})
        }
      } catch (e) {
        if (import.meta.env.DEV) console.debug('[auth] getSession failed', e)
      } finally {
        this.loading = false
        this.ready = true
      }
    },

    async loadProfile() {
      if (!this.userId) return
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.userId)
        .maybeSingle()
      if (error) throw error
      this.profile = data as Profile | null
    },

    async signUp(email: string, password: string, fullName: string) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
      // If email confirmations are off we get a session immediately. The
      // onAuthStateChange listener will also fire SIGNED_IN and populate
      // state, but do it synchronously here for the caller's next tick.
      // Profile + seed run best-effort — a failure here must NOT surface
      // as "sign up failed" to the caller when the session was created.
      if (data.session?.user) {
        this.userId = data.session.user.id
        this.email  = data.session.user.email ?? null
        this.loadProfile().catch(() => {})
        this.seedDefaults().catch(() => {})
      }
      return data
    },

    async signIn(email: string, password: string) {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // The listener will also fire SIGNED_IN and populate state, but do it
      // synchronously so the redirect after sign-in doesn't race the listener.
      // Post-signin work is best-effort — a slow/failing profile fetch or
      // seed RPC must NOT surface as "sign in failed" when the session is
      // actually established.
      this.userId = data.user.id
      this.email  = data.user.email ?? null
      this.loadProfile().catch(() => {})
      this.seedDefaults().catch(() => {})
    },

    async signOut() {
      // Drop the notifications realtime channel so a later sign-in
      // (possibly another account) subscribes fresh.
      const { useNotificationsStore } = await import('@/stores/notifications')
      const notifications = useNotificationsStore()
      notifications.unsubscribe()
      notifications.$reset()
      await supabase.auth.signOut()
      // No manual state clear here: the onAuthStateChange listener fires
      // SIGNED_OUT and clears userId/email/profile atomically. Clearing
      // here would just duplicate that — and if this action ran without
      // the listener (e.g. tests), the SIGNED_OUT event still fires.
    },

    async requestPasswordReset(email: string) {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
    },

    async updatePassword(password: string) {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },

    async updateProfile(patch: Partial<Profile>) {
      if (!this.userId) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', this.userId)
        .select()
        .single()
      if (error) throw error
      this.profile = data as Profile
    },

    async uploadAvatar(file: File) {
      if (!this.userId) throw new Error('Not signed in')
      const blob = await compressImage(file, 512, 0.85)
      const path = `${this.userId}/avatar-${Date.now()}.webp`
      const { error } = await supabase.storage.from(STORAGE_BUCKETS.avatars)
        .upload(path, blob, { contentType: 'image/webp', upsert: true, cacheControl: '3600' })
      if (error) throw error
      await this.updateProfile({ avatar_url: path })
    },

    /** Ensure default subjects + schedule exist. Safe to call repeatedly. */
    async seedDefaults() {
      if (!this.userId) return
      try {
        await supabase.rpc('seed_defaults_for', { uid: this.userId })
      } catch (e) {
        // Non-fatal — user can create subjects manually.
        console.warn('[uni-life] seed_defaults_for failed', e)
      }
    },
  },
})
