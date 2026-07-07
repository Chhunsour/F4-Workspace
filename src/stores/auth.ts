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
      this.loading = true
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        this.userId = session.user.id
        this.email  = session.user.email ?? null
        await this.loadProfile()
      }
      // IMPORTANT: never await Supabase DB calls *inside* this callback — supabase-js
      // holds the auth lock while it runs, and a query that needs the token would
      // wait on that same lock → deadlock (sign-in spins forever). Defer with setTimeout.
      supabase.auth.onAuthStateChange((_evt, session) => {
        this.userId = session?.user?.id ?? null
        this.email  = session?.user?.email ?? null
        if (this.userId) {
          setTimeout(() => { this.loadProfile().catch(() => {}) }, 0)
        } else {
          this.profile = null
        }
      })
      this.loading = false
      this.ready = true
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
      // If email confirmations are off, we get a session immediately.
      if (data.session?.user) {
        this.userId = data.session.user.id
        this.email  = data.session.user.email ?? null
        await this.loadProfile()
        await this.seedDefaults()
      }
      return data
    },

    async signIn(email: string, password: string) {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      this.userId = data.user.id
      this.email  = data.user.email ?? null
      await this.loadProfile()
      await this.seedDefaults()
    },

    async signOut() {
      // Drop the notifications realtime channel so a later sign-in
      // (possibly another account) subscribes fresh.
      const { useNotificationsStore } = await import('@/stores/notifications')
      const notifications = useNotificationsStore()
      notifications.unsubscribe()
      notifications.$reset()
      await supabase.auth.signOut()
      this.userId = null
      this.email  = null
      this.profile = null
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
