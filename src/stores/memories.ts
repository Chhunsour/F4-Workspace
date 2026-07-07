import { defineStore } from 'pinia'
import { supabase, STORAGE_BUCKETS, publicUrl } from '@/lib/supabase'
import { compressImage } from '@/lib/utils'
import type { Memory, MemoryImage } from '@/types'

export const useMemoriesStore = defineStore('memories', {
  state: () => ({
    items: [] as Memory[],
    loaded: false,
    loading: false,
    imagesByMemory: {} as Record<string, MemoryImage[]>,
  }),
  getters: {
    recent(state): Memory[] {
      return [...state.items].sort((a,b) => (b.event_date || b.created_at).localeCompare(a.event_date || a.created_at)).slice(0,6)
    },
    albums(state): string[] {
      const s = new Set<string>()
      state.items.forEach(m => m.album && s.add(m.album))
      return Array.from(s).sort()
    },
  },
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase.from('memories').select('*').order('event_date', { ascending: false, nullsFirst: false })
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as Memory[]
      // Fetch first-image thumbnails
      const ids = this.items.map(x => x.id)
      if (ids.length) {
        const { data: imgs } = await supabase.from('memory_images').select('*').in('memory_id', ids).order('position')
        this.imagesByMemory = {}
        for (const img of (imgs ?? []) as MemoryImage[]) {
          (this.imagesByMemory[img.memory_id] ??= []).push(img)
        }
      }
      this.loaded = true
    },
    thumbnailUrl(memoryId: string): string | null {
      const first = this.imagesByMemory[memoryId]?.[0]
      return first ? publicUrl('memories', first.storage_path) : null
    },
    async loadImages(memoryId: string) {
      const { data, error } = await supabase.from('memory_images').select('*').eq('memory_id', memoryId).order('position')
      if (error) throw error
      this.imagesByMemory[memoryId] = (data ?? []) as MemoryImage[]
    },
    async create(patch: Partial<Memory>): Promise<Memory> {
      const { data: sess } = await supabase.auth.getSession()
      const owner_id = sess.session?.user.id
      if (!owner_id) throw new Error('Not signed in')
      const { data, error } = await supabase.from('memories').insert({ owner_id, ...patch }).select().single()
      if (error) throw error
      const m = data as Memory
      this.items.unshift(m)
      return m
    },
    async update(id: string, patch: Partial<Memory>) {
      const { data, error } = await supabase.from('memories').update(patch).eq('id', id).select().single()
      if (error) throw error
      const i = this.items.findIndex(x => x.id === id); if (i !== -1) this.items[i] = data as Memory
      return data as Memory
    },
    async remove(id: string) {
      // Best effort: delete storage objects first, then row.
      const imgs = this.imagesByMemory[id] ?? []
      if (imgs.length) {
        const paths = imgs.map(i => i.storage_path)
        await supabase.storage.from(STORAGE_BUCKETS.memories).remove(paths)
      }
      const { error } = await supabase.from('memories').delete().eq('id', id)
      if (error) throw error
      this.items = this.items.filter(x => x.id !== id)
      delete this.imagesByMemory[id]
    },
    async uploadImages(memoryId: string, files: File[]) {
      const { data: sess } = await supabase.auth.getSession()
      const uid = sess.session?.user.id
      if (!uid) throw new Error('Not signed in')
      const existing = this.imagesByMemory[memoryId]?.length ?? 0
      let position = existing
      for (const file of files) {
        const blob = await compressImage(file, 1800, 0.82)
        const path = `${uid}/${memoryId}/${Date.now()}-${position}.webp`
        const up = await supabase.storage.from(STORAGE_BUCKETS.memories).upload(path, blob, {
          contentType: 'image/webp', upsert: false, cacheControl: '86400',
        })
        if (up.error) throw up.error
        const { data, error } = await supabase.from('memory_images').insert({
          memory_id: memoryId, storage_path: path, size_bytes: blob.size, position,
        }).select().single()
        if (error) throw error
        ;(this.imagesByMemory[memoryId] ??= []).push(data as MemoryImage)
        position++
      }
    },
    async toggleFavorite(id: string) {
      const m = this.items.find(x => x.id === id); if (!m) return
      return this.update(id, { is_favorite: !m.is_favorite })
    },
  },
})
