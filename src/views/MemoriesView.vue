<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useMemoriesStore } from '@/stores/memories'
import { useGroupsStore } from '@/stores/groups'
import { useSubjectsStore } from '@/stores/subjects'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import MemoryEditor from '@/components/memories/MemoryEditor.vue'
import { fmtDate } from '@/lib/utils'

const mem = useMemoriesStore()
const subjects = useSubjectsStore()
const groups = useGroupsStore()
const route = useRoute(); const router = useRouter()

const view = ref<'gallery'|'timeline'|'album'>('gallery')
const activeAlbum = ref<string>('')
const editorOpen = ref(false)

onMounted(async () => {
  await Promise.all([mem.fetch(), subjects.fetch(), groups.fetch()])
  if (route.query.new === '1') openNew()
})
watch(() => route.query.new, n => { if (n === '1') openNew() })

function openNew() {
  editorOpen.value = true
  if (route.query.new) router.replace({ query: { ...route.query, new: undefined } })
}

const displayed = computed(() => {
  let items = [...mem.items]
  if (activeAlbum.value) items = items.filter(m => m.album === activeAlbum.value)
  return items
})

const byMonth = computed(() => {
  const groups: Record<string, typeof displayed.value> = {}
  for (const m of displayed.value) {
    const key = (m.event_date || m.created_at).slice(0,7)
    ;(groups[key] ??= []).push(m)
  }
  return Object.entries(groups).sort((a,b) => b[0].localeCompare(a[0]))
})
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-2xl font-semibold">Memories</h2>
        <p class="text-sm text-night-500">{{ mem.items.length }} moments · {{ mem.albums.length }} albums</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="rounded-xl border border-surface-border dark:border-night-700 bg-white dark:bg-night-800 p-0.5 flex text-sm">
          <button v-for="v in ['gallery','timeline','album']" :key="v"
                  @click="view = v as any"
                  :class="['px-3 py-1.5 rounded-lg capitalize', view === v ? 'bg-brand-600 text-white' : 'text-night-700 dark:text-night-100']">
            {{ v }}
          </button>
        </div>
        <Button @click="openNew"><Icon name="plus" :size="16" /> New memory</Button>
      </div>
    </div>

    <div v-if="mem.albums.length" class="flex flex-wrap gap-2">
      <button @click="activeAlbum = ''"
              :class="['chip transition-colors', activeAlbum === '' ? '!bg-brand-600 !text-white' : '']">All</button>
      <button v-for="a in mem.albums" :key="a" @click="activeAlbum = a"
              :class="['chip transition-colors', activeAlbum === a ? '!bg-brand-600 !text-white' : '']">
        {{ a }}
      </button>
    </div>

    <EmptyState v-if="displayed.length === 0" icon="camera" title="No memories yet"
                body="Capture project nights, first-day chaos, and exam-week suffering.">
      <Button @click="openNew"><Icon name="plus" :size="16" /> New memory</Button>
    </EmptyState>

    <!-- gallery -->
    <div v-else-if="view === 'gallery'" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <RouterLink v-for="m in displayed" :key="m.id" :to="`/memories/${m.id}`"
                  class="group aspect-square rounded-2xl relative overflow-hidden bg-night-100 dark:bg-night-800 border border-surface-border dark:border-night-700">
        <img v-if="mem.thumbnailUrl(m.id)" :src="mem.thumbnailUrl(m.id)!"
             class="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-smooth" alt="" />
        <div v-else class="absolute inset-0 grid place-items-center text-night-300 dark:text-night-500"><Icon name="camera" :size="28" /></div>
        <div class="img-caption text-xs">
          <div class="font-medium truncate">{{ m.title || 'Untitled' }}</div>
          <div class="opacity-80 truncate">{{ fmtDate(m.event_date, { month:'short', day:'numeric', year:'numeric' }) }}</div>
        </div>
        <div v-if="m.is_favorite" class="absolute top-2 right-2 text-accent-300 drop-shadow"><Icon name="heart" :size="18" /></div>
      </RouterLink>
    </div>

    <!-- timeline -->
    <div v-else-if="view === 'timeline'" class="space-y-8">
      <section v-for="[month, items] in byMonth" :key="month">
        <h3 class="text-sm font-semibold text-night-500 uppercase tracking-wide mb-3">
          {{ new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }}
        </h3>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <RouterLink v-for="m in items" :key="m.id" :to="`/memories/${m.id}`"
                      class="card p-0 overflow-hidden card-hover">
            <div class="aspect-video relative bg-night-100 dark:bg-night-800">
              <img v-if="mem.thumbnailUrl(m.id)" :src="mem.thumbnailUrl(m.id)!" class="absolute inset-0 h-full w-full object-cover" alt="" />
            </div>
            <div class="p-3">
              <div class="font-medium truncate">{{ m.title || 'Untitled' }}</div>
              <div class="text-xs text-night-500 truncate">{{ fmtDate(m.event_date) || fmtDate(m.created_at) }} <span v-if="m.album"> · {{ m.album }}</span></div>
              <p v-if="m.caption" class="text-xs text-night-500 mt-1 line-clamp-2">{{ m.caption }}</p>
            </div>
          </RouterLink>
        </div>
      </section>
    </div>

    <!-- album -->
    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <button v-for="a in mem.albums" :key="a" class="card p-4 text-left hover:shadow-cardH"
              @click="activeAlbum = a; view = 'gallery'">
        <div class="font-semibold">{{ a }}</div>
        <p class="text-xs text-night-500 mt-1">{{ mem.items.filter(m => m.album === a).length }} memories</p>
      </button>
      <p v-if="!mem.albums.length" class="text-sm text-night-500">Add an album name when creating a memory to group them here.</p>
    </div>

    <MemoryEditor v-model:open="editorOpen" :editing="null" />
  </div>
</template>
