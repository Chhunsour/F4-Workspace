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
import ThrowbackCard from '@/components/dashboard/ThrowbackCard.vue'
import CommentThread from '@/components/shared/CommentThread.vue'
import { fmtDate, timeAgo } from '@/lib/utils'
import { publicUrl, supabase } from '@/lib/supabase'
import { REACTION_EMOJIS, type Memory, type MemoryImage, type Profile, type Reaction } from '@/types'
import { useI18n } from '@/composables/useI18n'

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
const editorOpen = ref(false)
const albumOpen = ref(false)
const albumDraft = ref('')
const defaultAlbum = ref('')
const lightbox = ref<{ memoryId: string; index: number } | null>(null)
const profiles = ref<Record<string, ProfileMini>>({})
const reactions = ref<Reaction[]>([])

const tabs: { key: Tab; label: string }[] = [
  { key: 'feed', label: 'Feed' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'albums', label: 'Albums' },
  { key: 'favorites', label: 'Favorites' },
]

const { error, loading, load } = useLoad(async () => {
  await Promise.all([mem.fetch(), subjects.fetch(), groups.fetch()])
  await loadPeopleAndReactions()
  if (route.query.new === '1') openNew()
})

watch(() => route.query.new, n => { if (n === '1') openNew() })
watch(() => route.query.person, p => { personFilter.value = p ? String(p) : '' }, { immediate: true })
watch(() => route.query.fav, fav => { if (fav === '1') tab.value = 'favorites' }, { immediate: true })
watch(() => route.query.view, view => { if (view === 'albums') tab.value = 'albums' }, { immediate: true })

async function loadPeopleAndReactions() {
  const ids = Array.from(new Set(mem.items.flatMap(m => [m.owner_id, ...(m.tagged_users ?? [])])))
  if (ids.length) {
    const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids)
    profiles.value = Object.fromEntries(((data ?? []) as ProfileMini[]).map(p => [p.id, p]))
  }
  const memoryIds = mem.items.map(m => m.id)
  if (memoryIds.length) {
    const { data } = await supabase.from('reactions').select('*').eq('target_type', 'memory').in('target_id', memoryIds)
    reactions.value = (data ?? []) as Reaction[]
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

function profileOf(id: string | null | undefined) {
  return id ? profiles.value[id] : null
}

function authorName(m: Memory) {
  return profileOf(m.owner_id)?.full_name || t('A friend')
}

function imagesOf(m: Memory) {
  return mem.imagesByMemory[m.id] ?? []
}

function coverOf(m: Memory) {
  return mem.thumbnailUrl(m.id)
}

function imageUrl(img: MemoryImage) {
  return publicUrl('memories', img.storage_path)
}

function avatarUrl(profile: ProfileMini | null | undefined) {
  return profile?.avatar_url ? publicUrl('avatars', profile.avatar_url) : null
}

function memoryDate(m: Memory) {
  return m.event_date ? new Date(m.event_date + 'T00:00:00') : new Date(m.created_at)
}

function describeAdded(m: Memory) {
  const count = imagesOf(m).length
  if (count <= 1) return t('Added a photo')
  return t('Added {count} photos', { count })
}

const filtered = computed(() => {
  let items = [...mem.items]
  if (personFilter.value) items = items.filter(m => m.owner_id === personFilter.value || (m.tagged_users ?? []).includes(personFilter.value))
  if (activeAlbum.value) items = items.filter(m => m.album === activeAlbum.value)
  if (tab.value === 'favorites') items = items.filter(m => m.is_favorite)
  return items.sort((a, b) => memoryDate(b).getTime() - memoryDate(a).getTime())
})

const totalPhotos = computed(() => mem.items.reduce((sum, m) => sum + imagesOf(m).length, 0))
const thisMonth = computed(() => {
  const now = new Date()
  return mem.items.filter(m => {
    const d = memoryDate(m)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
})
const contributors = computed(() => new Set(mem.items.map(m => m.owner_id)).size)
const personTitle = computed(() => personFilter.value ? t("{name}'s Memories", { name: profileOf(personFilter.value)?.full_name?.split(' ')[0] ?? t('Friend') }) : '')

const galleryPhotos = computed(() => filtered.value.flatMap((memory, memoryIndex) =>
  imagesOf(memory).map((image, index) => ({ memory, image, index, memoryIndex }))))

const albums = computed(() => {
  const names = new Set([...mem.albums, 'Class Moments', 'Project Nights', 'Presentation Day', 'Random Selfies', 'Exam Week', 'Trips', 'Graduation Journey'])
  return Array.from(names).map(name => {
    const items = mem.items.filter(m => m.album === name)
    const cover = items.find(m => coverOf(m))
    return {
      name,
      items,
      cover,
      photos: items.reduce((sum, m) => sum + imagesOf(m).length, 0),
      contributors: new Set(items.map(m => m.owner_id)).size,
    }
  }).sort((a, b) => (b.items.length - a.items.length) || a.name.localeCompare(b.name))
})

const recentActivity = computed(() => {
  const memoryItems = mem.items.slice(0, 4).map(m => ({
    id: `m-${m.id}`,
    text: t('{name} added {count} photos', { name: authorName(m).split(' ')[0], count: Math.max(1, imagesOf(m).length) }),
  }))
  const reactionItems = reactions.value.slice(0, 3).map(r => {
    const m = mem.items.find(x => x.id === r.target_id)
    return { id: `r-${r.id}`, text: t('{name} reacted {emoji} to {title}', {
      name: profileOf(r.owner_id)?.full_name?.split(' ')[0] ?? t('Someone'),
      emoji: r.emoji,
      title: m?.title || m?.caption || t('a memory'),
    }) }
  })
  return [...memoryItems, ...reactionItems].slice(0, 6)
})

const selectedMemory = computed(() => lightbox.value ? mem.items.find(m => m.id === lightbox.value!.memoryId) ?? null : null)
const selectedImages = computed(() => selectedMemory.value ? imagesOf(selectedMemory.value) : [])
const selectedImage = computed(() => lightbox.value ? selectedImages.value[lightbox.value.index] : null)
const selectedCounts = computed(() => {
  const c: Record<string, number> = {}
  if (!selectedMemory.value) return c
  for (const r of reactions.value.filter(r => r.target_id === selectedMemory.value!.id)) c[r.emoji] = (c[r.emoji] ?? 0) + 1
  return c
})
const selectedMine = computed(() => new Set(reactions.value.filter(r => r.owner_id === auth.userId && r.target_id === selectedMemory.value?.id).map(r => r.emoji)))

function openLightbox(memory: Memory, index = 0) {
  if (!imagesOf(memory).length) return
  lightbox.value = { memoryId: memory.id, index }
}

function stepLightbox(delta: number) {
  if (!lightbox.value || !selectedImages.value.length) return
  lightbox.value.index = (lightbox.value.index + delta + selectedImages.value.length) % selectedImages.value.length
}

async function toggleReaction(memory: Memory, emoji: string) {
  if (!auth.userId) return
  const mine = reactions.value.find(r => r.owner_id === auth.userId && r.target_id === memory.id && r.emoji === emoji)
  if (mine) await supabase.from('reactions').delete().eq('id', mine.id)
  else await supabase.from('reactions').insert({ owner_id: auth.userId, target_type: 'memory', target_id: memory.id, emoji })
  await loadPeopleAndReactions()
}

async function toggleFavorite(memory: Memory) {
  await mem.toggleFavorite(memory.id)
}

function clearPerson() {
  personFilter.value = ''
  router.replace({ query: { ...route.query, person: undefined } })
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <section class="overflow-hidden rounded-[2rem] bg-night-950 text-white shadow-pop">
      <div class="relative min-h-[260px] p-6 sm:p-8">
        <img v-if="galleryPhotos[0]" :src="imageUrl(galleryPhotos[0].image)" alt=""
             class="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div class="absolute inset-0 bg-gradient-to-br from-black/75 via-black/45 to-brand-900/30" />
        <div class="relative flex min-h-[220px] flex-col justify-between gap-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">{{ t('Shared gallery') }}</p>
              <h1 class="mt-2 text-4xl font-semibold tracking-tight">{{ personTitle || t('Memory') }}</h1>
              <p class="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
                {{ t('Photos, selfies, and moments from our university life.') }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="secondary" @click="albumOpen = true"><Icon name="projects" :size="16" /> {{ t('Create Album') }}</Button>
              <Button variant="accent" @click="openNew(activeAlbum)"><Icon name="camera" :size="16" /> {{ t('Add Memory') }}</Button>
            </div>
          </div>

          <div class="grid max-w-2xl grid-cols-3 gap-2">
            <div class="rounded-2xl bg-white/12 p-3 backdrop-blur">
              <div class="text-2xl font-semibold tabular-nums">{{ totalPhotos }}</div>
              <div class="text-xs text-white/65">{{ t('Total Memories') }}</div>
            </div>
            <div class="rounded-2xl bg-white/12 p-3 backdrop-blur">
              <div class="text-2xl font-semibold tabular-nums">{{ thisMonth }}</div>
              <div class="text-xs text-white/65">{{ t('This Month') }}</div>
            </div>
            <div class="rounded-2xl bg-white/12 p-3 backdrop-blur">
              <div class="text-2xl font-semibold tabular-nums">{{ contributors }}</div>
              <div class="text-xs text-white/65">{{ t('Contributors') }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <button v-for="item in tabs" :key="item.key" type="button"
              :class="['rounded-full px-4 py-2 text-sm font-medium transition-colors',
                       tab === item.key ? 'bg-brand-600 text-white' : 'bg-white/55 text-night-600 hover:bg-white/80 dark:bg-white/[0.06] dark:text-night-200']"
              @click="tab = item.key; if (item.key !== 'albums') activeAlbum = ''">
        {{ t(item.label) }}
      </button>
      <button v-if="personFilter" class="chip ml-auto" @click="clearPerson">
        {{ t('Clear person filter') }}
      </button>
    </div>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Skeleton height="h-[420px]" rounded="rounded-2xl" />
      <Skeleton height="h-[420px]" rounded="rounded-2xl" />
    </div>

    <template v-else-if="mem.items.length">
      <div v-if="tab === 'feed'" class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div class="space-y-5">
          <article v-for="memory in filtered" :key="memory.id" class="card overflow-hidden !rounded-[1.5rem]">
            <div class="flex items-center gap-3 p-4">
              <button class="contents" @click="router.replace({ query: { ...route.query, person: memory.owner_id } })">
                <Avatar :src="avatarUrl(profileOf(memory.owner_id))" :name="authorName(memory)" size="lg" />
                <span class="min-w-0 text-left">
                  <span class="block font-semibold text-night-900 dark:text-white">{{ authorName(memory) }}</span>
                  <span class="text-xs text-night-500">{{ describeAdded(memory) }} · {{ timeAgo(new Date(memory.created_at)) }}</span>
                </span>
              </button>
              <RouterLink :to="`/memories/${memory.id}`" class="link ml-auto text-xs">{{ t('Open') }}</RouterLink>
            </div>

            <div v-if="imagesOf(memory).length" class="grid gap-2 px-4" :class="imagesOf(memory).length === 1 ? 'grid-cols-1' : 'grid-cols-2'">
              <button v-for="(image, index) in imagesOf(memory).slice(0, 4)" :key="image.id"
                      type="button"
                      :class="['group relative overflow-hidden rounded-2xl bg-night-100 dark:bg-night-800',
                               imagesOf(memory).length === 1 ? 'max-h-[560px]' : index === 0 ? 'row-span-2 min-h-[320px]' : 'min-h-[155px]']"
                      @click="openLightbox(memory, index)">
                <img :src="imageUrl(image)" alt=""
                     :class="[imagesOf(memory).length === 1 ? 'max-h-[560px] w-full object-contain' : 'h-full w-full object-cover',
                              'transition-transform duration-500 group-hover:scale-[1.03]']" />
                <span v-if="index === 3 && imagesOf(memory).length > 4"
                      class="absolute inset-0 grid place-items-center bg-black/45 text-lg font-semibold text-white">
                  +{{ imagesOf(memory).length - 4 }}
                </span>
              </button>
            </div>

            <div class="space-y-3 p-4">
              <p v-if="memory.caption" class="text-[15px] text-night-800 dark:text-night-100">“{{ memory.caption }}”</p>
              <div class="flex flex-wrap items-center gap-2">
                <button v-for="emoji in REACTION_EMOJIS.slice(0, 6)" :key="emoji"
                        class="rounded-full bg-night-100 px-2.5 py-1 text-sm transition-colors hover:bg-brand-100 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                        @click="toggleReaction(memory, emoji)">
                  {{ emoji }}
                </button>
                <button class="chip" @click="openLightbox(memory, 0)"><Icon name="comment" :size="12" /> {{ t('Comment') }}</button>
                <button class="chip" @click="toggleFavorite(memory)"><Icon name="heart" :size="12" :class="memory.is_favorite && 'text-accent-500'" /> {{ t('Favorite') }}</button>
                <span v-if="memory.album" class="chip ml-auto">{{ memory.album }}</span>
              </div>
            </div>
          </article>
        </div>

        <aside class="space-y-5">
          <ThrowbackCard />
          <section class="card p-4">
            <h3 class="t-section mb-3">{{ t('Recent Activity') }}</h3>
            <ul class="space-y-3">
              <li v-for="item in recentActivity" :key="item.id" class="text-sm text-night-600 dark:text-night-200">{{ item.text }}</li>
            </ul>
          </section>
          <section class="card p-4">
            <h3 class="t-section mb-3">{{ t('Albums') }}</h3>
            <div class="flex flex-wrap gap-2">
              <button v-for="album in albums.slice(0, 7)" :key="album.name" class="chip" @click="activeAlbum = album.name; tab = 'gallery'">{{ album.name }}</button>
            </div>
          </section>
        </aside>
      </div>

      <section v-else-if="tab === 'gallery' || tab === 'favorites'" class="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        <button v-for="photo in galleryPhotos" :key="photo.image.id"
                type="button"
                class="group mb-4 block w-full overflow-hidden rounded-2xl bg-night-100 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-cardH dark:bg-night-800"
                @click="openLightbox(photo.memory, photo.index)">
          <img :src="imageUrl(photo.image)" alt="" class="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          <div class="flex items-center gap-2 p-3">
            <Avatar :src="avatarUrl(profileOf(photo.memory.owner_id))" :name="authorName(photo.memory)" size="sm" />
            <div class="min-w-0">
              <div class="truncate text-xs font-medium">{{ authorName(photo.memory) }}</div>
              <div class="text-[11px] text-night-500">{{ fmtDate(memoryDate(photo.memory), { month: 'short', day: 'numeric' }) }}</div>
            </div>
          </div>
        </button>
      </section>

      <section v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button v-for="album in albums" :key="album.name"
                type="button"
                class="group card overflow-hidden text-left card-hover"
                @click="activeAlbum = album.name; tab = 'gallery'">
          <div class="relative h-44 bg-night-100 dark:bg-night-800">
            <img v-if="album.cover && coverOf(album.cover)" :src="coverOf(album.cover)!" alt=""
                 class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            <div v-else class="grid h-full place-items-center text-night-300"><Icon name="memories" :size="34" /></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <div class="absolute bottom-3 left-3 text-white">
              <div class="font-semibold">{{ album.name }}</div>
              <div class="text-xs text-white/75">{{ t('{count} photos', { count: album.photos }) }} · {{ t('{count} contributors', { count: album.contributors }) }}</div>
            </div>
          </div>
        </button>
      </section>
    </template>

    <EmptyState v-else icon="camera" :title="t('No memories yet')"
                :body="t('Start the shared gallery with a selfie, project night, or class moment.')">
      <Button @click="openNew()"><Icon name="camera" :size="16" /> {{ t('Add Memory') }}</Button>
    </EmptyState>

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

    <teleport to="body">
      <transition name="fade">
        <div v-if="lightbox && selectedMemory && selectedImage"
             class="fixed inset-0 z-[90] grid bg-black/90 p-3 text-white lg:grid-cols-[minmax(0,1fr)_360px]"
             role="dialog" aria-modal="true" @click.self="lightbox = null">
          <div class="relative grid min-h-0 place-items-center">
            <img :src="imageUrl(selectedImage)" alt="" class="max-h-[92vh] max-w-full rounded-2xl object-contain shadow-2xl" />
            <button class="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                    :aria-label="t('Close')" @click="lightbox = null">
              <Icon name="close" :size="18" />
            </button>
            <template v-if="selectedImages.length > 1">
              <button class="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                      :aria-label="t('Previous photo')" @click.stop="stepLightbox(-1)">
                <Icon name="chevron_left" :size="20" />
              </button>
              <button class="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                      :aria-label="t('Next photo')" @click.stop="stepLightbox(1)">
                <Icon name="chevron_right" :size="20" />
              </button>
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
            <p v-if="selectedMemory.caption" class="mt-4 text-sm leading-relaxed">“{{ selectedMemory.caption }}”</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button v-for="emoji in REACTION_EMOJIS.slice(0, 6)" :key="emoji"
                      :class="['rounded-full px-3 py-1.5 text-sm transition-colors',
                               selectedMine.has(emoji) ? 'bg-brand-600 text-white' : 'bg-night-100 dark:bg-white/[0.08]']"
                      @click="toggleReaction(selectedMemory, emoji)">
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
