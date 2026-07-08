<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useMemoriesStore } from '@/stores/memories'
import { useSubjectsStore } from '@/stores/subjects'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import Badge from '@/components/ui/Badge.vue'
import Avatar from '@/components/ui/Avatar.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import MemoryEditor from '@/components/memories/MemoryEditor.vue'
import CommentThread from '@/components/shared/CommentThread.vue'
import { fmtDate, timeAgo } from '@/lib/utils'
import { supabase, publicUrl } from '@/lib/supabase'
import { REACTION_EMOJIS } from '@/types'
import type { Memory, Reaction } from '@/types'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const mem = useMemoriesStore()
const subjects = useSubjectsStore()
const auth = useAuthStore()
const toast = useToast()

const editing = ref(false)
const loading = ref(true)
const reactions = ref<Reaction[]>([])
const memoryId = computed(() => String(route.params.id))
const memory = computed<Memory | null>(() => mem.items.find(m => m.id === memoryId.value) ?? null)
const images = computed(() => mem.imagesByMemory[memoryId.value] ?? [])

async function loadReactions() {
  const { data } = await supabase.from('reactions').select('*').eq('target_type', 'memory').eq('target_id', memoryId.value)
  reactions.value = (data ?? []) as Reaction[]
}

const { error, load } = useLoad(async () => {
  loading.value = true
  try {
    await Promise.all([mem.fetch(), subjects.fetch()])
    await Promise.all([mem.loadImages(memoryId.value), loadReactions()])
  } finally { loading.value = false }
})
watch(memoryId, () => load())

const ago = computed(() => {
  if (!memory.value) return ''
  const d = memory.value.event_date ? new Date(memory.value.event_date + 'T00:00:00') : new Date(memory.value.created_at)
  return timeAgo(d)
})
const friendsReacted = computed(() =>
  new Set(reactions.value.filter(r => r.owner_id !== auth.userId).map(r => r.owner_id)).size)

const counts = computed(() => {
  const c: Record<string, number> = {}
  for (const r of reactions.value) c[r.emoji] = (c[r.emoji] ?? 0) + 1
  return c
})
const mine = computed(() => new Set(reactions.value.filter(r => r.owner_id === auth.userId).map(r => r.emoji)))

async function toggleReaction(emoji: string) {
  if (!auth.userId) return
  if (mine.value.has(emoji)) {
    await supabase.from('reactions').delete().eq('owner_id', auth.userId).eq('target_type', 'memory').eq('target_id', memoryId.value).eq('emoji', emoji)
  } else {
    await supabase.from('reactions').insert({ owner_id: auth.userId, target_type: 'memory', target_id: memoryId.value, emoji })
  }
  await loadReactions()
}
async function toggleFavorite() {
  if (memory.value) { await mem.toggleFavorite(memory.value.id); toast.success(memory.value.is_favorite ? 'Favorited' : 'Unfavorited') }
}

// ---- lightbox ----
const lightbox = ref<number | null>(null)
function stepLightbox(delta: number) {
  if (lightbox.value === null || !images.value.length) return
  lightbox.value = (lightbox.value + delta + images.value.length) % images.value.length
}
function onLightboxKey(e: KeyboardEvent) {
  if (lightbox.value === null) return
  if (e.key === 'Escape') lightbox.value = null
  else if (e.key === 'ArrowRight') stepLightbox(1)
  else if (e.key === 'ArrowLeft') stepLightbox(-1)
}
watch(lightbox, (v) => {
  if (v !== null) { window.addEventListener('keydown', onLightboxKey); document.body.style.overflow = 'hidden' }
  else { window.removeEventListener('keydown', onLightboxKey); document.body.style.overflow = '' }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onLightboxKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-4">
    <RouterLink to="/memory" class="text-xs font-medium text-night-600 dark:text-night-200 hover:text-brand-600 dark:hover:text-brand-300 inline-flex items-center gap-1 transition-colors">
      <Icon name="chevron_left" :size="14" /> Memories
    </RouterLink>

    <LoadError v-if="error" :message="error" @retry="load" />

    <LoadingSpinner v-else-if="loading" label="Loading memory…" />

    <template v-else-if="memory">
      <div class="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 class="t-page">{{ memory.title || 'Untitled memory' }}</h2>
          <div class="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
            <span v-if="memory.event_date" class="font-semibold text-night-800 dark:text-white">{{ fmtDate(memory.event_date, { weekday:'long', month:'long', day:'numeric', year:'numeric' }) }}</span>
            <span class="text-night-500 dark:text-night-300">· {{ ago }}</span>
            <Badge v-if="memory.album"><Icon name="memories" :size="12" /> {{ memory.album }}</Badge>
            <Badge v-if="subjects.byId(memory.subject_id)" :dot="subjects.byId(memory.subject_id)!.color">{{ subjects.byId(memory.subject_id)!.name }}</Badge>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="secondary" size="sm" @click="toggleFavorite">
            <Icon name="heart" :size="16" :class="memory.is_favorite ? 'text-blush-500' : ''" />
            {{ memory.is_favorite ? 'Favorited' : 'Favorite' }}
          </Button>
          <Button variant="secondary" size="sm" @click="editing = true"><Icon name="edit" :size="16" /> Edit</Button>
        </div>
      </div>

      <p v-if="memory.caption" class="text-night-700 dark:text-night-100 whitespace-pre-wrap">{{ memory.caption }}</p>

      <div v-if="images.length" class="grid gap-3" :class="images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'">
        <button v-for="(img, i) in images" :key="img.id" type="button"
                class="block rounded-2xl overflow-hidden bg-night-100 dark:bg-night-800 aspect-square"
                :aria-label="`View photo ${i + 1} of ${images.length}`"
                @click="lightbox = i">
          <img :src="publicUrl('memories', img.storage_path)" loading="lazy" decoding="async"
               class="h-full w-full object-cover" alt="" />
        </button>
      </div>
      <EmptyState v-else icon="camera" title="No photos yet" body="Edit this memory to upload photos." />

      <!-- reactions + comments flow under the photos, no boxes -->
      <section class="space-y-4">
        <div class="flex flex-wrap items-center gap-1.5">
          <button v-for="e in REACTION_EMOJIS" :key="e"
            @click="toggleReaction(e)"
            :class="['h-10 px-3.5 rounded-full border text-sm inline-flex items-center gap-1.5 transition-all',
                     mine.has(e)
                       ? 'bg-brand-600 border-brand-600 text-white shadow-brand animate-springIn'
                       : 'border-[var(--card-border-strong)] hover:border-brand-400 hover:bg-brand-500/6 dark:hover:bg-brand-400/10 hover:scale-105']">
            <span class="text-base">{{ e }}</span>
            <span class="text-xs font-semibold opacity-90 tabular-nums">{{ counts[e] ?? '' }}</span>
          </button>
          <span v-if="friendsReacted" class="ml-1 text-xs font-medium text-night-600 dark:text-night-200">
            {{ friendsReacted }} friend{{ friendsReacted === 1 ? '' : 's' }} reacted
          </span>
        </div>

        <div class="divider" />

        <div>
          <h4 class="t-section mb-3">Comments</h4>
          <CommentThread target-type="memory" :target-id="memory.id" />
        </div>
      </section>

      <MemoryEditor v-model:open="editing" :editing="memory" />

      <!-- Lightbox -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="lightbox !== null" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4"
               role="dialog" aria-modal="true" @click.self="lightbox = null">
            <img :src="publicUrl('memories', images[lightbox].storage_path)"
                 class="max-h-[88vh] max-w-[94vw] rounded-xl object-contain shadow-2xl" alt="" />
            <button class="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    aria-label="Close" @click="lightbox = null">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </button>
            <template v-if="images.length > 1">
              <button class="absolute left-3 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                      aria-label="Previous photo" @click.stop="stepLightbox(-1)">
                <Icon name="chevron_left" :size="20" />
              </button>
              <button class="absolute right-3 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                      aria-label="Next photo" @click.stop="stepLightbox(1)">
                <Icon name="chevron_right" :size="20" />
              </button>
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white tabular-nums">
                {{ lightbox + 1 }} / {{ images.length }}
              </div>
            </template>
          </div>
        </transition>
      </teleport>
    </template>

    <EmptyState v-else icon="search" title="Memory not found" body="It may have been deleted." />
  </div>
</template>
