import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { Assignment, AssignmentStatus, Priority } from '@/types'

export const useAssignmentsStore = defineStore('assignments', {
  state: () => ({
    items: [] as Assignment[],
    loaded: false,
    loading: false,
    filter: { subject: '' as string, priority: '' as '' | Priority, status: '' as '' | AssignmentStatus, q: '' },
  }),
  getters: {
    filtered(state): Assignment[] {
      return state.items.filter(a => {
        if (state.filter.subject && a.subject_id !== state.filter.subject) return false
        if (state.filter.priority && a.priority !== state.filter.priority) return false
        if (state.filter.status && a.status !== state.filter.status) return false
        if (state.filter.q) {
          const q = state.filter.q.toLowerCase()
          if (!(a.title || '').toLowerCase().includes(q) &&
              !(a.description || '').toLowerCase().includes(q)) return false
        }
        return true
      })
    },
    upcoming(state): Assignment[] {
      const today = new Date(); today.setHours(0,0,0,0)
      return state.items
        .filter(a => a.status !== 'completed' && a.due_date)
        .sort((a,b) => (a.due_date! + (a.due_time ?? '')).localeCompare(b.due_date! + (b.due_time ?? '')))
    },
    overdueCount(state) {
      const today = new Date(); today.setHours(0,0,0,0)
      return state.items.filter(a => a.status !== 'completed' && a.due_date && new Date(a.due_date) < today).length
    },
    completedThisWeek(state) {
      const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0)
      return state.items.filter(a => a.completed_at && new Date(a.completed_at) >= start).length
    },
  },
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as Assignment[]
      this.loaded = true
    },
    async create(patch: Partial<Assignment> & { title: string }) {
      const { data: sess } = await supabase.auth.getSession()
      const owner_id = sess.session?.user.id
      if (!owner_id) throw new Error('Not signed in')
      const { data, error } = await supabase.from('assignments').insert({ owner_id, ...patch }).select().single()
      if (error) throw error
      this.items.unshift(data as Assignment)
      return data
    },
    async update(id: string, patch: Partial<Assignment>) {
      const nextPatch = { ...patch }
      if (patch.status === 'completed' && !patch.completed_at) nextPatch.completed_at = new Date().toISOString()
      if (patch.status && patch.status !== 'completed') nextPatch.completed_at = null
      const { data, error } = await supabase.from('assignments').update(nextPatch).eq('id', id).select().single()
      if (error) throw error
      const i = this.items.findIndex(x => x.id === id)
      if (i !== -1) this.items[i] = data as Assignment
      return data
    },
    async remove(id: string) {
      const { error } = await supabase.from('assignments').delete().eq('id', id)
      if (error) throw error
      this.items = this.items.filter(x => x.id !== id)
    },
    async toggleComplete(id: string) {
      const a = this.items.find(x => x.id === id); if (!a) return
      return this.update(id, a.status === 'completed'
        ? { status: 'todo', progress: 0 }
        : { status: 'completed', progress: 100 })
    },
  },
})
