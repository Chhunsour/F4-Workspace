import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

// Read-only view over the existing `profiles` table (profiles_read = using(true)).
// NOT a second profile system — just the roster for the Team page. No emails
// are exposed here; they live in auth.users, which we never query.
export const usePeopleStore = defineStore('people', {
  state: () => ({
    items: [] as Profile[],
    loaded: false,
    loading: false,
  }),
  getters: {
    byId: (s) => (id: string | null | undefined) => (id ? s.items.find(p => p.id === id) ?? null : null),
  },
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as Profile[]
      this.loaded = true
    },
  },
})
