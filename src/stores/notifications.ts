import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Kept outside the store state — Pinia's reactive proxy breaks the channel's type/identity.
let channel: RealtimeChannel | null = null

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [] as Notification[],
    loaded: false,
    loading: false,
  }),
  getters: {
    unreadCount: (s) => s.items.filter(n => !n.is_read).length,
  },
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase.from('notifications')
        .select('*').order('created_at', { ascending: false }).limit(30)
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as Notification[]
      this.loaded = true
    },

    /** One realtime channel for my own notifications. Safe to call repeatedly. */
    async subscribe() {
      if (channel) return
      const { data: sess } = await supabase.auth.getSession()
      const uid = sess.session?.user.id
      if (!uid) return
      channel = supabase
        .channel('my-notifications')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
          (payload) => { this.items.unshift(payload.new as Notification) })
        .subscribe()
    },

    unsubscribe() {
      if (channel) { supabase.removeChannel(channel); channel = null }
    },

    async markRead(id: string) {
      const n = this.items.find(x => x.id === id)
      if (!n || n.is_read) return
      n.is_read = true
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    },

    async markAllRead() {
      const hadUnread = this.items.some(n => !n.is_read)
      this.items.forEach(n => { n.is_read = true })
      if (hadUnread) await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    },
  },
})

/** Where a notification points. */
export function notificationRoute(n: Notification): string {
  switch (n.target_type) {
    case 'memory':  return `/memories/${n.target_id}`
    case 'project': return `/projects/${n.target_id}`
    case 'group':   return `/groups/${n.target_id}`
    default:        return '/'
  }
}
