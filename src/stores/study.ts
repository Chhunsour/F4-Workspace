import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { StudySession } from '@/types'

interface ActiveTimer {
  sessionId: string | null
  subjectId: string | null
  topic: string
  startedAt: number       // ms
  pausedAt: number | null
  accumulatedMs: number   // time before pause resumes
  focusMode: boolean
}

const KEY = 'uni-life-active-timer'

export const useStudyStore = defineStore('study', {
  state: () => ({
    items: [] as StudySession[],
    loaded: false,
    loading: false,
    active: null as ActiveTimer | null,
    weeklyGoalMinutes: 600, // 10h/week default
  }),
  getters: {
    totalToday(state) {
      const today = new Date(); today.setHours(0,0,0,0)
      return state.items.filter(s => new Date(s.started_at) >= today)
        .reduce((sum, s) => sum + s.duration_seconds, 0)
    },
    totalThisWeek(state) {
      const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0)
      return state.items.filter(s => new Date(s.started_at) >= start)
        .reduce((sum, s) => sum + s.duration_seconds, 0)
    },
    streakDays(state): number {
      const days = new Set(state.items.map(s => new Date(s.started_at).toISOString().slice(0,10)))
      let count = 0
      const d = new Date(); d.setHours(0,0,0,0)
      while (days.has(d.toISOString().slice(0,10))) {
        count++
        d.setDate(d.getDate() - 1)
      }
      return count
    },
    favoriteSubjectId(state): string | null {
      const bySub: Record<string, number> = {}
      for (const s of state.items) if (s.subject_id) bySub[s.subject_id] = (bySub[s.subject_id] ?? 0) + s.duration_seconds
      let best: [string, number] | null = null
      for (const [k,v] of Object.entries(bySub)) if (!best || v > best[1]) best = [k,v]
      return best?.[0] ?? null
    },
  },
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase.from('study_sessions').select('*').order('started_at', { ascending: false }).limit(500)
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as StudySession[]
      this.loaded = true
      this.restoreActive()
    },
    restoreActive() {
      try {
        const raw = localStorage.getItem(KEY)
        if (raw) this.active = JSON.parse(raw) as ActiveTimer
      } catch {/* ignore */}
    },
    persistActive() {
      if (this.active) localStorage.setItem(KEY, JSON.stringify(this.active))
      else localStorage.removeItem(KEY)
    },

    async start(subjectId: string | null, topic: string, focusMode = false) {
      const { data: sess } = await supabase.auth.getSession()
      const owner_id = sess.session?.user.id
      if (!owner_id) throw new Error('Not signed in')
      const { data, error } = await supabase.from('study_sessions').insert({
        owner_id, subject_id: subjectId, topic: topic || null, is_focus_mode: focusMode,
        started_at: new Date().toISOString(),
      }).select().single()
      if (error) throw error
      this.active = {
        sessionId: data.id, subjectId, topic, startedAt: Date.now(),
        pausedAt: null, accumulatedMs: 0, focusMode,
      }
      this.persistActive()
      this.items.unshift(data as StudySession)
    },
    pause() {
      if (!this.active || this.active.pausedAt) return
      this.active.pausedAt = Date.now()
      this.persistActive()
    },
    resume() {
      if (!this.active || !this.active.pausedAt) return
      this.active.accumulatedMs += Date.now() - this.active.pausedAt
      // Reset startedAt reference so elapsed = (now - startedAt - accumulatedMs)
      this.active.pausedAt = null
      this.persistActive()
    },
    async complete(notes?: string) {
      if (!this.active || !this.active.sessionId) return
      const elapsedMs = (this.active.pausedAt ?? Date.now()) - this.active.startedAt - this.active.accumulatedMs
      const duration_seconds = Math.max(1, Math.round(elapsedMs / 1000))
      const { data, error } = await supabase.from('study_sessions').update({
        ended_at: new Date().toISOString(),
        duration_seconds,
        notes: notes ?? null,
      }).eq('id', this.active.sessionId).select().single()
      if (error) throw error
      const i = this.items.findIndex(x => x.id === this.active!.sessionId)
      if (i !== -1) this.items[i] = data as StudySession
      this.active = null
      this.persistActive()
    },
    async cancel() {
      if (!this.active?.sessionId) { this.active = null; this.persistActive(); return }
      await supabase.from('study_sessions').delete().eq('id', this.active.sessionId)
      this.items = this.items.filter(x => x.id !== this.active!.sessionId)
      this.active = null
      this.persistActive()
    },

    /** Live elapsed seconds for the ticking UI. */
    elapsedSeconds(now = Date.now()) {
      if (!this.active) return 0
      const end = this.active.pausedAt ?? now
      return Math.max(0, Math.round((end - this.active.startedAt - this.active.accumulatedMs) / 1000))
    },
  },
})
