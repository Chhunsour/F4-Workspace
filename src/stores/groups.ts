import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { Group, GroupMember, Profile } from '@/types'

interface DetailBundle {
  group: Group
  members: (GroupMember & { profile?: Pick<Profile,'full_name'|'avatar_url'|'major'|'year'> | null })[]
}

export const useGroupsStore = defineStore('groups', {
  state: () => ({
    items: [] as Group[],
    loaded: false,
    loading: false,
    detail: null as DetailBundle | null,
    detailLoading: false,
  }),
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false })
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as Group[]
      this.loaded = true
    },
    async create(name: string, description?: string) {
      const { data: sess } = await supabase.auth.getSession()
      const owner_id = sess.session?.user.id
      if (!owner_id) throw new Error('Not signed in')
      const { data, error } = await supabase.from('groups').insert({ owner_id, name, description }).select().single()
      if (error) throw error
      const group = data as Group
      await supabase.from('group_members').insert({ group_id: group.id, user_id: owner_id, role: 'owner' })
      this.items.unshift(group)
      return group
    },
    async joinByCode(code: string) {
      // RLS hides groups from non-members, so a direct select by code always
      // came back empty. The SECURITY DEFINER RPC (migration 003) does the
      // lookup + membership insert server-side.
      const { data, error } = await supabase.rpc('join_group_by_code', { code: code.trim() })
      if (error) throw new Error(error.message.includes('No group found') ? 'Group not found for that code.' : error.message)
      const g = data as Group
      if (!this.items.find(x => x.id === g.id)) this.items.unshift(g)
      return g
    },
    async leave(groupId: string) {
      const { data: sess } = await supabase.auth.getSession()
      const uid = sess.session?.user.id
      if (!uid) throw new Error('Not signed in')
      const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', uid)
      if (error) throw error
      this.items = this.items.filter(x => x.id !== groupId)
    },
    async remove(id: string) {
      const { error } = await supabase.from('groups').delete().eq('id', id)
      if (error) throw error
      this.items = this.items.filter(x => x.id !== id)
    },
    async loadDetail(id: string) {
      this.detailLoading = true
      try {
        const [g, m] = await Promise.all([
          supabase.from('groups').select('*').eq('id', id).single(),
          supabase.from('group_members').select('*, profile:profiles(full_name, avatar_url, major, year)').eq('group_id', id),
        ])
        if (g.error) throw g.error
        if (m.error) throw m.error
        this.detail = { group: g.data as Group, members: (m.data ?? []) as any }
      } finally { this.detailLoading = false }
    },
  },
})
