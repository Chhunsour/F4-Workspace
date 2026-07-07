import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { Subject } from '@/types'

export const useSubjectsStore = defineStore('subjects', {
  state: () => ({
    items: [] as Subject[],
    loaded: false,
    loading: false,
  }),
  getters: {
    byId: (s) => (id: string | null | undefined) => s.items.find(x => x.id === id) ?? null,
    options: (s) => s.items.map(x => ({ value: x.id, label: x.name })),
  },
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true })
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as Subject[]
      this.loaded = true
    },
    async create(patch: Partial<Subject> & { name: string }) {
      const { data: sess } = await supabase.auth.getSession()
      const owner_id = sess.session?.user.id
      if (!owner_id) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('subjects')
        .insert({ owner_id, color: '#3a68ff', ...patch })
        .select()
        .single()
      if (error) throw error
      this.items.push(data as Subject)
      this.items.sort((a,b) => a.name.localeCompare(b.name))
      return data as Subject
    },
    async update(id: string, patch: Partial<Subject>) {
      const { data, error } = await supabase.from('subjects').update(patch).eq('id', id).select().single()
      if (error) throw error
      const i = this.items.findIndex(x => x.id === id)
      if (i !== -1) this.items[i] = data as Subject
      return data as Subject
    },
    async remove(id: string) {
      const { error } = await supabase.from('subjects').delete().eq('id', id)
      if (error) throw error
      this.items = this.items.filter(x => x.id !== id)
    },
  },
})
