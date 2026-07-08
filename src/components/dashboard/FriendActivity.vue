<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useMemoriesStore } from '@/stores/memories'
import { useProjectsStore } from '@/stores/projects'
import { fmtDate } from '@/lib/utils'
import type { Comment } from '@/types'

interface Item { icon: string; text: string; when: string; to: string }

const auth = useAuthStore()
const mem = useMemoriesStore()
const projects = useProjectsStore()

// Comments from friends on my stuff need one query; everything else is
// derived from stores the dashboard already loads.
const friendComments = ref<(Comment & { author?: { full_name: string | null } | null })[]>([])

// The dashboard fetches stores in parallel after mount — wait until both
// are loaded before asking which of my things friends commented on.
const queried = ref(false)
watch(() => mem.loaded && projects.loaded, async (ready) => {
  if (!ready || queried.value || !auth.userId) return
  queried.value = true
  const ids = [...mem.items.slice(0, 20).map(m => m.id), ...projects.items.slice(0, 20).map(p => p.id)]
  if (!ids.length) return
  const { data } = await supabase.from('comments')
    .select('*, author:profiles!comments_owner_id_fkey(full_name)')
    .in('target_id', ids)
    .neq('owner_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(5)
  friendComments.value = (data ?? []) as any
}, { immediate: true })

const items = computed<Item[]>(() => {
  const out: (Item & { ts: string })[] = []

  for (const m of mem.items) {
    if (m.group_id && m.owner_id !== auth.userId) {
      out.push({
        icon: 'camera',
        text: `New shared memory: ${m.title || 'Untitled'}`,
        when: m.created_at, ts: m.created_at, to: `/memories/${m.id}`,
      })
    }
  }
  for (const c of friendComments.value) {
    out.push({
      icon: 'notes',
      text: `${c.author?.full_name ?? 'Someone'} commented: “${c.body.slice(0, 60)}${c.body.length > 60 ? '…' : ''}”`,
      when: c.created_at, ts: c.created_at,
      to: c.target_type === 'memory' ? `/memories/${c.target_id}` : `/projects/${c.target_id}`,
    })
  }
  for (const p of projects.items) {
    if (p.group_id && p.status === 'active' && p.progress > 0) {
      out.push({
        icon: 'projects',
        text: `${p.name} is ${p.progress}% done`,
        when: p.updated_at, ts: p.updated_at, to: `/projects/${p.id}`,
      })
    }
  }

  return out.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 6)
})
</script>

<template>
  <section v-if="items.length">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="t-section flex items-center gap-2">
        Friend life
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-blush-500 animate-livePulse" />
      </h3>
    </div>
    <ul class="space-y-1">
      <li v-for="(it, i) in items" :key="i">
        <RouterLink :to="it.to"
                    class="group -mx-2 flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-brand-500/6 dark:hover:bg-brand-400/10">
          <span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-500/12 text-brand-600 dark:bg-brand-400/20 dark:text-brand-200 group-hover:scale-105 transition-transform">
            <Icon :name="it.icon" :size="14" />
          </span>
          <span class="min-w-0 flex-1 text-sm leading-snug text-night-800 dark:text-night-100 group-hover:text-night-900 dark:group-hover:text-white transition-colors">{{ it.text }}</span>
          <span class="shrink-0 text-[11px] font-medium text-night-500 dark:text-night-300">{{ fmtDate(it.when, { month:'short', day:'numeric' }) }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
