import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { localIso } from '@/lib/utils'
import type { AcademicEvent } from '@/types'

function toMin(t: string | null) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** One-time academic events (exams, finals, presentations). Separate from the
 *  recurring class_schedules table so dated events don't pollute weekly data. */
export const useAcademicEventsStore = defineStore('academicEvents', {
  state: () => ({
    items: [] as AcademicEvent[],
    loaded: false,
    loading: false,
  }),
  getters: {
    // Events on a given local date, sorted by start time.
    byDate: (s) => (iso: string) =>
      s.items
        .filter(e => e.event_date === iso)
        .sort((a, b) => toMin(a.start_time) - toMin(b.start_time)),

    // Future (and today's) events, soonest first — for Upcoming / Home.
    upcoming(s): AcademicEvent[] {
      const today = localIso(new Date())
      return s.items
        .filter(e => e.event_date >= today)
        .sort((a, b) => (a.event_date + (a.start_time ?? '')).localeCompare(b.event_date + (b.start_time ?? '')))
    },
  },
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase.from('academic_events').select('*').order('event_date')
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as AcademicEvent[]
      this.loaded = true
    },
    async create(patch: Partial<AcademicEvent> & { type: AcademicEvent['type']; event_date: string }) {
      const { data: sess } = await supabase.auth.getSession()
      const owner_id = sess.session?.user.id
      if (!owner_id) throw new Error('Not signed in')
      const { data, error } = await supabase.from('academic_events').insert({ owner_id, ...patch }).select().single()
      if (error) throw error
      this.items.push(data as AcademicEvent)
      return data as AcademicEvent
    },
    async update(id: string, patch: Partial<AcademicEvent>) {
      const { data, error } = await supabase.from('academic_events').update(patch).eq('id', id).select().single()
      if (error) throw error
      const i = this.items.findIndex(x => x.id === id)
      if (i !== -1) this.items[i] = data as AcademicEvent
      return data as AcademicEvent
    },
    async remove(id: string) {
      const { error } = await supabase.from('academic_events').delete().eq('id', id)
      if (error) throw error
      this.items = this.items.filter(x => x.id !== id)
    },
  },
})

/** Build the concrete start/end Date objects for an event on its date. */
export function eventDateTimes(e: AcademicEvent) {
  const base = new Date(e.event_date + 'T00:00:00')
  const start = new Date(base)
  if (e.start_time) { const [h, m] = e.start_time.split(':').map(Number); start.setHours(h, m, 0, 0) }
  const end = new Date(base)
  if (e.end_time) { const [h, m] = e.end_time.split(':').map(Number); end.setHours(h, m, 0, 0) }
  return { start, end }
}
