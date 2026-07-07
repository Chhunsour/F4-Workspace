import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { ClassSchedule } from '@/types'

function timeToMinutes(t: string) {
  const [h,m] = t.split(':').map(Number)
  return h * 60 + m
}

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    items: [] as ClassSchedule[],
    loaded: false,
    loading: false,
  }),
  getters: {
    byWeekday: (s) => (weekday: number) =>
      s.items
        .filter(x => x.weekday === weekday)
        .sort((a,b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)),

    /** Time-aware: pass a ticking `now` so the result advances as classes
     *  start/end. (A plain getter caches on store state and goes stale.) */
    nextClassAt(): (now: Date) => ClassSchedule | null {
      return (now) => {
        const nowMin = now.getHours() * 60 + now.getMinutes()
        let c = this.byWeekday(now.getDay()).find(x => timeToMinutes(x.end_time) > nowMin) ?? null
        for (let d = 1; d <= 7 && !c; d++) {
          c = this.byWeekday((now.getDay() + d) % 7)[0] ?? null
        }
        return c
      }
    },
  },
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase.from('class_schedules').select('*')
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as ClassSchedule[]
      this.loaded = true
    },
    async create(patch: Partial<ClassSchedule> & { weekday: number; start_time: string; end_time: string }) {
      const { data: sess } = await supabase.auth.getSession()
      const owner_id = sess.session?.user.id
      if (!owner_id) throw new Error('Not signed in')
      const { data, error } = await supabase.from('class_schedules').insert({ owner_id, ...patch }).select().single()
      if (error) throw error
      this.items.push(data as ClassSchedule)
      return data
    },
    async update(id: string, patch: Partial<ClassSchedule>) {
      const { data, error } = await supabase.from('class_schedules').update(patch).eq('id', id).select().single()
      if (error) throw error
      const i = this.items.findIndex(x => x.id === id)
      if (i !== -1) this.items[i] = data as ClassSchedule
      return data
    },
    async remove(id: string) {
      const { error } = await supabase.from('class_schedules').delete().eq('id', id)
      if (error) throw error
      this.items = this.items.filter(x => x.id !== id)
    },
  },
})

export function classDateForToday(c: { start_time: string; end_time: string; weekday: number }, now = new Date()) {
  const d = new Date(now)
  const delta = (c.weekday - d.getDay() + 7) % 7
  d.setDate(d.getDate() + delta)
  const [sh, sm] = c.start_time.split(':').map(Number)
  const start = new Date(d); start.setHours(sh, sm, 0, 0)
  const [eh, em] = c.end_time.split(':').map(Number)
  const end   = new Date(d); end.setHours(eh, em, 0, 0)
  return { start, end }
}
