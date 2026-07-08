<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useMemoriesStore } from '@/stores/memories'
import { useGroupsStore } from '@/stores/groups'
import { useSubjectsStore } from '@/stores/subjects'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Avatar from '@/components/ui/Avatar.vue'
import MemoryEditor from '@/components/memories/MemoryEditor.vue'
import CommentThread from '@/components/shared/CommentThread.vue'
import { fmtDate, timeAgo } from '@/lib/utils'
import { publicUrl, supabase } from '@/lib/supabase'
import { REACTION_EMOJIS, type Memory, type MemoryImage, type Profile, type Reaction } from '@/types'
import { useI18n } from '@/composables/useI18n'

// Tab keys kept as-is ('gallery'/'favorites') to reuse existing render logic;
// they're surfaced in the UI under friendlier labels (Photos / Saved).
type Tab = 'feed' | 'gallery' | 'albums' | 'favorites'
type ProfileMini = Pick<Profile, 'id' | 'full_name' | 'avatar_url'>

const mem = useMemoriesStore()
const subjects = useSubjectsStore()
const groups = useGroupsStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const tab = ref<Tab>('feed')
const activeAlbum = ref('')
const personFilter = ref('')
const search = ref('')
const searchOpen = ref(false)
const editorOpen = ref(false)
const albumOpen = ref(false)
const albumDraft = ref('')
const defaultAlbum = ref('')
const lightbox = ref<{ memoryId: string; index: number } | null>(null)
const profiles = ref<Record<string, ProfileMini>>({})
const reactions = ref<Reaction[]>([])
const commentCounts = ref<Record<string, number>>({})

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'feed', label: 'Feed', icon: 'memories' },
  { key: 'gallery', label: 'Photos', icon: 'camera' },
  { key: 'albums', label: 'Albums', icon: 'projects' },
  { key: 'favorites', label: 'Saved', icon: 'heart' },
]

const { error, loading, load } = useLoad(async () => {
  await Promise.all([mem.fetch(), subjects.fetch(), groups.fetch()])
  await loadSocial()
  if (route.query.new === '1') openNew()
})

watch(() => route.query.new, n => { if (n === '1') openNew() })
watch(() => route.query.person, p => { personFilter.value = p ? String(p) : '' }, { immediate: true })
watch(() => route.query.fav, fav => { if (fav === '1') tab.value = 'favorites' }, { immediate: true })
watch(() => route.query.view, view => { if (view === 'albums') tab.value = 'albums' }, { immediate: true })

async function loadSocial() {
  const ids = Array.from(new Set(mem.items.flatMap(m => [m.owner_id, ...(m.tagged_users ?? [])])))
  if (ids.length) {
    const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids)
    profiles.value = Object.fromEntries(((data ?? []) as ProfileMini[]).map(p => [p.id, p]))
  }
  const memoryIds = mem.items.map(m => m.id)
  if (memoryIds.length) {
    const [{ data: rx }, { data: cm }] = await Promise.all([
      supabase.from('reactions').select('*').eq('target_type', 'memory').in('target_id', memoryIds),
      supabase.from('comments').select('target_id').eq('target_type', 'memory').in('target_id', memoryIds),
    ])
    reactions.value = (rx ?? []) as Reaction[]
    const counts: Record<string, number> = {}
    for (const c of (cm ?? []) as { target_id: string }[]) counts[c.target_id] = (counts[c.target_id] ?? 0) + 1
    commentCounts.value = counts
  }
}

function openNew(album = '') {
  defaultAlbum.value = album
  editorOpen.value = true
  if (route.query.new) router.replace({ query: { ...route.query, new: undefined } })
}

function createAlbum() {
  const name = albumDraft.value.trim()
  if (!name) return
  activeAlbum.value = name
  tab.value = 'albums'
  albumOpen.value = false
  albumDraft.value = ''
  openNew(name)
}

function profileOf(id: string | null | undefined) { return id ? profiles.value[id] : null }
function authorName(m: Memory) { return profileOf(m.owner_id)?.full_name || t('A friend') }
function imagesOf(m: Memory) { return mem.imagesByMemory[m.id] ?? [] }
function coverOf(m: Memory) { return mem.thumbnailUrl(m.id) }
function imageUrl(img: MemoryImage) { return publicUrl('memories', img.storage_path) }
function avatarUrl(p: ProfileMini | null | undefined) { return p?.avatar_url ? publicUrl('avatars', p.avatar_url) : null }
function memoryDate(m: Memory) { return m.event_date ? new Date(m.event_date + 'T00:00:00') : new Date(m.created_at) }

// ---- reactions (one per user per post, Facebook-style) ----
const reactionsByMemory = computed(() => {
  const map: Record<string, Reaction[]> = {}
  for (const r of reactions.value) (map[r.target_id] ??= []).push(r)
  return map
})
function reactionSummary(m: Memory) {
  const rs = reactionsByMemory.value[m.id] ?? []
  const order = new Map<string, number>()
  for (const r of rs) order.set(r.emoji, (order.get(r.emoji) ?? 0) + 1)
  const emojis = [...order.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 3)
  return { emojis, total: rs.length }
}
function myReaction(m: Memory): string | null {
  return reactions.value.find(r => r.owner_id === auth.userId && r.target_id === m.id)?.emoji ?? null
}
async function reactTo(m: Memory, emoji: string) {
  const uid = auth.userId
  if (!uid) return
  const mine = reactions.value.filter(r => r.owner_id === uid && r.target_id === m.id)
  const same = mine.some(r => r.emoji === emoji)
  // optimistic: drop my existing reaction, add the new one unless it was a toggle-off
  reactions.value = reactions.value.filter(r => !(r.owner_id === uid && r.target_id === m.id))
  if (!same) reactions.value.push({ id: 'tmp-' + Date.now(), owner_id: uid, target_type: 'memory', target_id: m.id, emoji, created_at: new Date().toISOString() })
  if (mine.length) await supabase.from('reactions').delete().eq('owner_id', uid).eq('target_type', 'memory').eq('target_id', m.id)
  if (!same) await supabase.from('reactions').insert({ owner_id: uid, target_type: 'memory', target_id: m.id, emoji })
  await loadSocial()
}
async function toggleFavorite(m: Memory) { await mem.toggleFavorite(m.id) }

// ---- filtering ----
const filtered = computed(() => {
  let items = [...mem.items]
  if (personFilter.value) items = items.filter(m => m.owner_id === personFilter.value || (m.tagged_users ?? []).includes(personFilter.value))
  if (activeAlbum.value) items = items.filter(m => m.album === activeAlbum.value)
  if (tab.value === 'favorites') items = items.filter(m => m.is_favorite)
  const q = search.value.trim().toLowerCase()
  if (q) items = items.filter(m =>
    (m.caption ?? '').toLowerCase().includes(q) ||
    (m.title ?? '').toLowerCase().includes(q) ||
    (m.album ?? '').toLowerCase().includes(q) ||
    authorName(m).toLowerCase().includes(q))
  return items.sort((a, b) => memoryDate(b).getTime() - memoryDate(a).getTime())
})

// ---- stories row: recent contributors (excluding me) ----
const storyPeople = computed(() => {
  const seen = new Set<string>()
  const out: ProfileMini[] = []
  for (const m of [...mem.items].sort((a, b) => memoryDate(b).getTime() - memoryDate(a).getTime())) {
    if (m.owner_id === auth.userId || seen.has(m.owner_id)) continue
    seen.add(m.owner_id)
    const p = profileOf(m.owner_id)
    if (p) out.push(p)
    if (out.length >= 12) break
  }
  return out
})

const galleryPhotos = computed(() => filtered.value.flatMap(memory =>
  imagesOf(memory).map((image, index) => ({ memory, image, index }))))

const albums = computed(() => {
  const names = new Set([...mem.albums, 'Class Moments', 'Project Nights', 'Presentation Day', 'Random Selfies', 'Exam Week', 'Trips'])
  return Array.from(names).map(name => {
    const items = mem.items.filter(m => m.album === name)
    const cover = items.find(m => coverOf(m))
    return {
      name, items, cover,
      photos: items.reduce((sum, m) => sum + imagesOf(m).length, 0),
      contributors: new Set(items.map(m => m.owner_id)).size,
    }
  }).sort((a, b) => (b.items.length - a.items.length) || a.name.localeCompare(b.name))
})

// ---- small "alive" social lines (not analytics cards) ----
const newThisWeek = computed(() => {
  const wk = Date.now() - 7 * 864e5
  return mem.items.filter(m => new Date(m.created_at).getTime() >= wk).length
})
const photosThisWeek = computed(() => {
  const wk = Date.now() - 7 * 864e5
  return mem.items.filter(m => new Date(m.created_at).getTime() >= wk).reduce((s, m) => s + imagesOf(m).length, 0)
})
const trending = computed(() => {
  let best: Memory | null = null, bestN = 0
  for (const m of mem.items) {
    const n = (reactionsByMemory.value[m.id]?.length ?? 0) + (commentCounts.value[m.id] ?? 0)
    if (n > bestN) { best = m; bestN = n }
  }
  return best ? { memory: best, score: bestN } : null
})

const personTitle = computed(() => personFilter.value
  ? t("{name}'s Memories", { name: profileOf(personFilter.value)?.full_name?.split(' ')[0] ?? t('Friend') }) : '')
function clearPerson() {
  personFilter.value = ''
  router.replace({ query: { ...route.query, person: undefined } })
}

// ---- lightbox (photo viewing + comments) ----
const selectedMemory = computed(() => lightbox.value ? mem.items.find(m => m.id === lightbox.value!.memoryId) ?? null : null)
const selectedImages = computed(() => selectedMemory.value ? imagesOf(selectedMemory.value) : [])
const selectedImage = computed(() => lightbox.value ? selectedImages.value[lightbox.value.index] : null)
const selectedCounts = computed(() => {
  const c: Record<string, number> = {}
  if (!selectedMemory.value) return c
  for (const r of reactions.value.filter(r => r.target_id === selectedMemory.value!.id)) c[r.emoji] = (c[r.emoji] ?? 0) + 1
  return c
})
const selectedMine = computed(() => selectedMemory.value ? myReaction(selectedMemory.value) : null)

function openLightbox(memory: Memory, index = 0) {
  if (!imagesOf(memory).length) return
  lightbox.value = { memoryId: memory.id, index }
}
function stepLightbox(delta: number) {
  if (!lightbox.value || !selectedImages.value.length) return
  lightbox.value.index = (lightbox.value.index + delta + selectedImages.value.length) % selectedImages.value.length
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <!-- Top bar -->
    <header class="sticky top-0 z-30 -mx-1 mb-4 flex items-center gap-3 px-1 py-3">
      <div class="glass-panel absolute inset-0 -z-10 !rounded-2xl" aria-hidden="true" />
      <div class="min-w-0 flex-1 pl-2">
        <h1 class="t-page leading-none">{{ personTitle || t('Memory') }}</h1>
        <p class="mt-1 text-sm text-night-500 dark:text-night-300">{{ t('Moments from Team F4 life.') }}</p>
      </div>
      <button v-if="personFilter" class="chip" @click="clearPerson"><Icon name="close" :size="12" /> {{ t('Clear') }}</button>
      <button class="grid h-10 w-10 place-items-center rounded-xl text-night-600 transition-colors hover:bg-white/60 dark:text-night-200 dark:hover:bg-white/[0.08]"
              :aria-label="t('Search')" @click="searchOpen = !searchOpen">
        <Icon name="search" :size="18" />
      </button>
      <Button size="sm" @click="openNew(activeAlbum)"><Icon name="camera" :size="16" /> {{ t('Add Post') }}</Button>
    </header>

    <!-- Search field (collapsible) -->
    <transition name="fade">
      <div v-if="searchOpen" class="mb-4">
        <Input v-model="search" :placeholder="t('Search captions, people, albums…')" autofocus />
      </div>
    </transition>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div class="space-y-4">
        <Skeleton height="h-20" rounded="rounded-2xl" />
        <Skeleton height="h-[420px]" rounded="rounded-2xl" />
      </div>
      <Skeleton height="h-[300px]" rounded="rounded-2xl" class="hidden lg:block" />
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <!-- ===================== CENTER: feed ===================== -->
      <div class="min-w-0 space-y-5">
        <!-- Stories / moments -->
        <div v-if="mem.items.length" class="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          <button type="button" class="group flex w-16 flex-none flex-col items-center gap-1.5" @click="openNew()">
            <span class="relative grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-brand-400 bg-brand-50 transition-colors group-hover:bg-brand-100 dark:border-brand-500/60 dark:bg-brand-500/10">
              <Avatar :src="auth.avatarPublicUrl" :name="auth.displayName" size="lg" class="opacity-90" />
              <span class="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white ring-2 ring-white dark:ring-night-900"><Icon name="plus" :size="12" /></span>
            </span>
            <span class="truncate text-[11px] font-medium text-night-600 dark:text-night-300">{{ t('Your story') }}</span>
          </button>
          <button v-for="p in storyPeople" :key="p.id" type="button"
                  class="group flex w-16 flex-none flex-col items-center gap-1.5"
                  @click="router.replace({ query: { ...route.query, person: p.id } })">
            <span class="story-ring transition-transform group-hover:scale-105">
              <span class="block rounded-full bg-white p-[2px] dark:bg-[var(--surface-secondary)]">
                <Avatar :src="avatarUrl(p)" :name="p.full_name" size="lg" />
              </span>
            </span>
            <span class="w-16 truncate text-center text-[11px] font-medium text-night-700 dark:text-night-100">{{ p.full_name?.split(' ')[0] }}</span>
          </button>
        </div>

        <!-- Create post box -->
        <div class="card p-3">
          <div class="flex items-center gap-3">
            <Avatar :src="auth.avatarPublicUrl" :name="auth.displayName" size="md" />
            <button type="button"
                    class="flex-1 rounded-full bg-white/60 px-4 py-2.5 text-left text-sm text-night-500 transition-colors hover:bg-white/85 dark:bg-white/[0.05] dark:text-night-300 dark:hover:bg-white/[0.09]"
                    @click="openNew()">
              {{ t('What happened today?') }}
            </button>
          </div>
          <div class="mt-2.5 flex items-center gap-1 border-t border-[var(--glass-hair)] pt-2.5">
            <button class="flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-[13px] font-medium text-night-600 transition-colors hover:bg-white/60 dark:text-night-200 dark:hover:bg-white/[0.06]" @click="openNew()">
              <Icon name="camera" :size="16" class="text-brand-500" /> {{ t('Photo') }}
            </button>
            <button class="flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-[13px] font-medium text-night-600 transition-colors hover:bg-white/60 dark:text-night-200 dark:hover:bg-white/[0.06]" @click="albumOpen = true">
              <Icon name="projects" :size="16" class="text-accent-500" /> {{ t('Album') }}
            </button>
            <button class="flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-[13px] font-medium text-night-600 transition-colors hover:bg-white/60 dark:text-night-200 dark:hover:bg-white/[0.06]" @click="openNew()">
              <Icon name="groups" :size="16" class="text-emerald-500" /> {{ t('Tag friends') }}
            </button>
          </div>
        </div>

        <!-- Filter pills -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button v-for="item in tabs" :key="item.key" type="button"
                  :class="['inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                           tab === item.key
                             ? 'bg-brand-600 text-white shadow-[0_4px_12px_-4px_rgba(91,123,212,0.6)]'
                             : 'bg-white/55 text-night-600 hover:bg-white/80 dark:bg-white/[0.06] dark:text-night-200 dark:hover:bg-white/[0.1]']"
                  @click="tab = item.key; if (item.key !== 'albums') activeAlbum = ''">
            <Icon :name="item.icon" :size="14" /> {{ t(item.label) }}
          </button>
        </div>

        <!-- ===================== FEED TAB ===================== -->
        <template v-if="tab === 'feed'">
          <p v-if="newThisWeek" class="px-1 text-[13px] text-night-500 dark:text-night-300">
            <Icon name="fire" :size="13" class="-mt-0.5 inline text-accent-500" />
            {{ t('{count} new this week', { count: newThisWeek }) }}<span v-if="photosThisWeek"> · {{ t('{count} photos', { count: photosThisWeek }) }}</span>
          </p>

          <article v-for="memory in filtered" :key="memory.id"
                   class="animate-slideUp overflow-hidden rounded-2xl border border-[var(--glass-hair)] bg-[var(--solid-surface)] shadow-card">
            <!-- header -->
            <div class="flex items-center gap-3 px-4 pt-3.5">
              <button class="flex min-w-0 items-center gap-3 text-left" @click="router.replace({ query: { ...route.query, person: memory.owner_id } })">
                <Avatar :src="avatarUrl(profileOf(memory.owner_id))" :name="authorName(memory)" size="md" />
                <span class="min-w-0">
                  <span class="block truncate font-semibold leading-tight text-night-900 hover:underline dark:text-white">{{ authorName(memory) }}</span>
                  <span class="text-xs text-night-500 dark:text-night-300">
                    {{ timeAgo(new Date(memory.created_at)) }}<span v-if="memory.album"> · {{ memory.album }}</span>
                  </span>
                </span>
              </button>
              <RouterLink :to="`/memories/${memory.id}`" class="ml-auto grid h-8 w-8 place-items-center rounded-full text-night-400 transition-colors hover:bg-white/70 hover:text-night-700 dark:hover:bg-white/[0.08] dark:hover:text-white" :aria-label="t('Open')">
                <Icon name="more" :size="18" />
              </RouterLink>
            </div>

            <!-- caption -->
            <p v-if="memory.caption" class="px-4 pt-2.5 text-[15px] leading-relaxed text-night-800 dark:text-night-100">{{ memory.caption }}</p>

            <!-- photos -->
            <div v-if="imagesOf(memory).length" class="mt-3 grid grid-cols-2 gap-0.5">
              <button v-for="(image, index) in imagesOf(memory).slice(0, 4)" :key="image.id" type="button"
                      :class="['group relative overflow-hidden bg-night-100 dark:bg-night-800',
                               imagesOf(memory).length === 1 ? 'col-span-2 aspect-[4/3]'
                                 : imagesOf(memory).length === 3 && index === 0 ? 'row-span-2 aspect-auto'
                                 : 'aspect-square']"
                      @click="openLightbox(memory, index)">
                <img :src="imageUrl(image)" alt="" loading="lazy"
                     class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                <span v-if="index === 3 && imagesOf(memory).length > 4"
                      class="absolute inset-0 grid place-items-center bg-black/50 text-xl font-semibold text-white backdrop-blur-[1px]">
                  +{{ imagesOf(memory).length - 4 }}
                </span>
              </button>
            </div>

            <!-- reaction / comment summary -->
            <div v-if="reactionSummary(memory).total || commentCounts[memory.id]"
                 class="flex items-center gap-2 px-4 pt-3 text-xs text-night-500 dark:text-night-300">
              <span v-if="reactionSummary(memory).total" class="flex items-center">
                <span v-for="e in reactionSummary(memory).emojis" :key="e" class="-ml-0.5 text-sm first:ml-0">{{ e }}</span>
                <span class="ml-1.5">{{ reactionSummary(memory).total }}</span>
              </span>
              <button v-if="commentCounts[memory.id]" class="ml-auto hover:underline" @click="openLightbox(memory, 0)">
                {{ t('{count} comments', { count: commentCounts[memory.id] }) }}
              </button>
            </div>

            <!-- action bar -->
            <div class="mt-2 flex items-center gap-1 border-t border-[var(--glass-hair)] px-2 py-1.5">
              <!-- React (hover reveals picker on desktop) -->
              <div class="group relative flex-1">
                <button :class="['flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium transition-colors',
                                 myReaction(memory) ? 'text-brand-600 dark:text-brand-300' : 'text-night-600 hover:bg-white/60 dark:text-night-200 dark:hover:bg-white/[0.06]']"
                        @click="reactTo(memory, myReaction(memory) ?? '❤️')">
                  <span v-if="myReaction(memory)" class="text-base leading-none">{{ myReaction(memory) }}</span>
                  <Icon v-else name="heart" :size="16" />
                  {{ myReaction(memory) ? t('Reacted') : t('React') }}
                </button>
                <div class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 flex -translate-x-1/2 scale-90 gap-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 opacity-0 shadow-pop backdrop-blur-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                  <button v-for="emoji in REACTION_EMOJIS" :key="emoji" type="button"
                          class="grid h-9 w-9 place-items-center rounded-full text-xl transition-transform duration-150 hover:-translate-y-1 hover:scale-125"
                          @click="reactTo(memory, emoji)">{{ emoji }}</button>
                </div>
              </div>
              <button class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium text-night-600 transition-colors hover:bg-white/60 dark:text-night-200 dark:hover:bg-white/[0.06]" @click="openLightbox(memory, 0)">
                <Icon name="comment" :size="16" /> {{ t('Comment') }}
              </button>
              <button :class="['flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium transition-colors',
                               memory.is_favorite ? 'text-accent-600 dark:text-accent-300' : 'text-night-600 hover:bg-white/60 dark:text-night-200 dark:hover:bg-white/[0.06]']"
                      @click="toggleFavorite(memory)">
                <Icon name="heart" :size="16" /> {{ memory.is_favorite ? t('Saved') : t('Save') }}
              </button>
            </div>
          </article>

          <EmptyState v-if="!filtered.length" icon="camera" :title="t('No posts yet')"
                      :body="t('Be the first to share something from class, a project night, or a random selfie.')">
            <Button @click="openNew()"><Icon name="camera" :size="16" /> {{ t('Create first post') }}</Button>
          </EmptyState>
        </template>

        <!-- ===================== PHOTOS / SAVED ===================== -->
        <section v-else-if="tab === 'gallery' || tab === 'favorites'">
          <div v-if="galleryPhotos.length" class="columns-2 gap-3 sm:columns-3">
            <button v-for="photo in galleryPhotos" :key="photo.image.id" type="button"
                    class="group mb-3 block w-full overflow-hidden rounded-xl bg-night-100 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-cardH dark:bg-night-800"
                    @click="openLightbox(photo.memory, photo.index)">
              <img :src="imageUrl(photo.image)" alt="" loading="lazy" class="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            </button>
          </div>
          <EmptyState v-else icon="camera" :title="tab === 'favorites' ? t('Nothing saved yet') : t('No photos yet')"
                      :body="tab === 'favorites' ? t('Tap Save on a post to keep it here.') : t('Share a photo to start the gallery.')" />
        </section>

        <!-- ===================== ALBUMS ===================== -->
        <section v-else class="grid gap-4 sm:grid-cols-2">
          <button v-for="album in albums" :key="album.name" type="button"
                  class="group card overflow-hidden text-left card-hover"
                  @click="activeAlbum = album.name; tab = 'gallery'">
            <div class="relative h-40 bg-night-100 dark:bg-night-800">
              <img v-if="album.cover && coverOf(album.cover)" :src="coverOf(album.cover)!" alt="" loading="lazy"
                   class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div v-else class="grid h-full place-items-center text-night-300"><Icon name="memories" :size="30" /></div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div class="absolute bottom-3 left-3 text-white">
                <div class="font-semibold">{{ album.name }}</div>
                <div class="text-xs text-white/80">{{ t('{count} photos', { count: album.photos }) }}</div>
              </div>
            </div>
          </button>
        </section>
      </div>

      <!-- ===================== RIGHT PANEL ===================== -->
      <aside class="hidden space-y-4 lg:block">
        <section v-if="storyPeople.length" class="card p-4">
          <h3 class="t-section mb-3">{{ t('In your circle') }}</h3>
          <div class="flex flex-wrap gap-2">
            <button v-for="p in storyPeople.slice(0, 8)" :key="p.id" :title="p.full_name ?? ''"
                    @click="router.replace({ query: { ...route.query, person: p.id } })">
              <Avatar :src="avatarUrl(p)" :name="p.full_name" size="md" />
            </button>
          </div>
        </section>

        <section v-if="trending" class="card p-4">
          <h3 class="t-section mb-3"><Icon name="fire" :size="13" class="-mt-0.5 inline text-accent-500" /> {{ t('Trending this week') }}</h3>
          <button class="flex w-full items-center gap-3 text-left" @click="openLightbox(trending.memory, 0)">
            <img v-if="coverOf(trending.memory)" :src="coverOf(trending.memory)!" alt="" class="h-14 w-14 flex-none rounded-xl object-cover" />
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-night-800 dark:text-night-100">{{ trending.memory.caption || trending.memory.title || t('a moment') }}</span>
              <span class="text-xs text-night-500 dark:text-night-300">{{ authorName(trending.memory).split(' ')[0] }} · {{ t('{count} reactions', { count: trending.score }) }}</span>
            </span>
          </button>
        </section>

        <section class="card p-4">
          <h3 class="t-section mb-3">{{ t('Recent albums') }}</h3>
          <div class="flex flex-wrap gap-2">
            <button v-for="album in albums.slice(0, 7)" :key="album.name" class="chip" @click="activeAlbum = album.name; tab = 'gallery'">{{ album.name }}</button>
          </div>
        </section>
      </aside>
    </div>

    <!-- Album modal -->
    <Modal v-model:open="albumOpen" :title="t('Create Album')">
      <div class="space-y-3">
        <Input v-model="albumDraft" :label="t('Album name')" placeholder="Presentation Day" autofocus />
        <p class="text-sm text-night-500">{{ t('Albums are made from memories. Add the first photo to bring it to life.') }}</p>
      </div>
      <template #footer>
        <Button variant="ghost" size="sm" @click="albumOpen = false">{{ t('Cancel') }}</Button>
        <Button size="sm" @click="createAlbum">{{ t('Create Album') }}</Button>
      </template>
    </Modal>

    <MemoryEditor v-model:open="editorOpen" :editing="null" :default-album="defaultAlbum" />

    <!-- Lightbox -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="lightbox && selectedMemory && selectedImage"
             class="fixed inset-0 z-[90] grid bg-black/90 p-3 text-white lg:grid-cols-[minmax(0,1fr)_360px]"
             role="dialog" aria-modal="true" @click.self="lightbox = null">
          <div class="relative grid min-h-0 place-items-center">
            <img :src="imageUrl(selectedImage)" alt="" class="max-h-[92vh] max-w-full rounded-2xl object-contain shadow-2xl" />
            <button class="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                    :aria-label="t('Close')" @click="lightbox = null"><Icon name="close" :size="18" /></button>
            <template v-if="selectedImages.length > 1">
              <button class="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                      :aria-label="t('Previous photo')" @click.stop="stepLightbox(-1)"><Icon name="chevron_left" :size="20" /></button>
              <button class="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                      :aria-label="t('Next photo')" @click.stop="stepLightbox(1)"><Icon name="chevron_right" :size="20" /></button>
            </template>
          </div>
          <aside class="mt-3 overflow-y-auto rounded-3xl bg-white p-4 text-night-900 lg:mt-0 dark:bg-night-900 dark:text-white">
            <div class="flex items-center gap-3">
              <Avatar :src="avatarUrl(profileOf(selectedMemory.owner_id))" :name="authorName(selectedMemory)" size="md" />
              <div>
                <div class="font-semibold">{{ authorName(selectedMemory) }}</div>
                <div class="text-xs text-night-500">{{ fmtDate(memoryDate(selectedMemory), { month: 'long', day: 'numeric', year: 'numeric' }) }}</div>
              </div>
              <button class="ml-auto grid h-9 w-9 place-items-center rounded-full bg-night-100 dark:bg-white/[0.08]" @click="toggleFavorite(selectedMemory)">
                <Icon name="heart" :size="16" :class="selectedMemory.is_favorite && 'text-accent-500'" />
              </button>
            </div>
            <p v-if="selectedMemory.caption" class="mt-4 text-sm leading-relaxed">{{ selectedMemory.caption }}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button v-for="emoji in REACTION_EMOJIS" :key="emoji"
                      :class="['rounded-full px-3 py-1.5 text-sm transition-transform duration-150 hover:scale-110',
                               selectedMine === emoji ? 'bg-brand-600 text-white' : 'bg-night-100 dark:bg-white/[0.08]']"
                      @click="reactTo(selectedMemory, emoji)">
                {{ emoji }} <span class="text-xs opacity-70">{{ selectedCounts[emoji] ?? '' }}</span>
              </button>
            </div>
            <div class="my-4 divider" />
            <h3 class="t-section mb-3">{{ t('Comments') }}</h3>
            <CommentThread :key="selectedMemory.id" target-type="memory" :target-id="selectedMemory.id" />
          </aside>
        </div>
      </transition>
    </teleport>
  </div>
</template>
