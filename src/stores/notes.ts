import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { Note } from '@/types'

export const useNotesStore = defineStore('notes', {
  state: () => ({
    items: [] as Note[],
    loaded: false,
    loading: false,
    q: '',
    activeTag: '' as string,
  }),
  getters: {
    tags(state) {
      const s = new Set<string>()
      state.items.forEach(n => n.tags.forEach(t => s.add(t)))
      return Array.from(s).sort()
    },
    filtered(state) {
      return [...state.items]
        .filter(n => {
          if (state.activeTag && !n.tags.includes(state.activeTag)) return false
          if (state.q) {
            const q = state.q.toLowerCase()
            if (!(n.title || '').toLowerCase().includes(q) &&
                !(n.body || '').toLowerCase().includes(q) &&
                !n.tags.join(' ').toLowerCase().includes(q)) return false
          }
          return true
        })
        .sort((a,b) => Number(b.is_pinned) - Number(a.is_pinned) || b.updated_at.localeCompare(a.updated_at))
    },
    recent(state) {
      return [...state.items].sort((a,b) => Number(b.is_pinned) - Number(a.is_pinned) || b.updated_at.localeCompare(a.updated_at)).slice(0,4)
    },
  },
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false })
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as Note[]
      this.loaded = true
    },
    async create(patch: Partial<Note> = {}) {
      const { data: sess } = await supabase.auth.getSession()
      const owner_id = sess.session?.user.id
      if (!owner_id) throw new Error('Not signed in')
      const { data, error } = await supabase.from('notes').insert({ owner_id, body: '', ...patch }).select().single()
      if (error) throw error
      this.items.unshift(data as Note)
      return data as Note
    },
    async update(id: string, patch: Partial<Note>) {
      const { data, error } = await supabase.from('notes').update(patch).eq('id', id).select().single()
      if (error) throw error
      const i = this.items.findIndex(x => x.id === id); if (i !== -1) this.items[i] = data as Note
      return data as Note
    },
    async remove(id: string) {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
      this.items = this.items.filter(x => x.id !== id)
    },
    async togglePin(id: string) {
      const n = this.items.find(x => x.id === id); if (!n) return
      return this.update(id, { is_pinned: !n.is_pinned })
    },
  },
})
