<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotesStore } from '@/stores/notes'
import { debounce, fmtDate } from '@/lib/utils'
import { NOTE_COLORS } from '@/types'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import type { Note } from '@/types'

const store = useNotesStore()
const route = useRoute(); const router = useRouter()
const toast = useToast(); const confirm = useConfirm()

const active = ref<Note | null>(null)
const draft = ref<{ title: string; body: string; color: string; tags: string[]; is_pinned: boolean; newTag: string }>({
  title: '', body: '', color: '#ffffff', tags: [], is_pinned: false, newTag: '',
})

onMounted(async () => {
  await store.fetch()
  const wanted = route.query.id as string | undefined
  if (wanted) open(store.items.find(n => n.id === wanted) ?? null)
  else if (route.query.new === '1') await createBlank()
})
watch(() => route.query.new, n => { if (n === '1') createBlank() })

function open(n: Note | null) {
  active.value = n
  if (n) {
    draft.value = { title: n.title ?? '', body: n.body, color: n.color ?? '#ffffff', tags: [...n.tags], is_pinned: n.is_pinned, newTag: '' }
  }
}
async function createBlank() {
  const n = await store.create({ title: '', body: '', color: NOTE_COLORS[0] })
  open(n)
  if (route.query.new) router.replace({ query: { ...route.query, new: undefined, id: n.id } })
}

const persist = debounce(async () => {
  if (!active.value) return
  await store.update(active.value.id, {
    title: draft.value.title || null,
    body: draft.value.body,
    color: draft.value.color,
    tags: draft.value.tags,
    is_pinned: draft.value.is_pinned,
  })
}, 500)
watch(() => JSON.stringify(draft.value), () => { if (active.value) persist() })

function addTag() {
  const t = draft.value.newTag.trim().toLowerCase()
  if (t && !draft.value.tags.includes(t)) draft.value.tags.push(t)
  draft.value.newTag = ''
}
function removeTag(t: string) {
  draft.value.tags = draft.value.tags.filter(x => x !== t)
}

async function remove() {
  if (!active.value) return
  const ok = await confirm.ask({ title: 'Delete note?', destructive: true, confirmLabel: 'Delete' })
  if (!ok) return
  await store.remove(active.value.id)
  toast.success('Note deleted')
  active.value = null
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-2xl font-semibold">Notes</h2>
        <p class="text-sm text-night-500">{{ store.items.length }} notes</p>
      </div>
      <Button @click="createBlank"><Icon name="plus" :size="16" /> New note</Button>
    </div>

    <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
      <!-- list -->
      <div>
        <Card padded class="!p-3">
          <div class="space-y-2">
            <Input v-model="store.q" placeholder="Search notes…" />
            <div class="flex flex-wrap gap-1.5">
              <button v-for="t in store.tags" :key="t"
                @click="store.activeTag = store.activeTag === t ? '' : t"
                :class="['chip transition-colors', store.activeTag === t ? '!bg-brand-600 !text-white' : '']">
                #{{ t }}
              </button>
            </div>
          </div>
        </Card>

        <EmptyState v-if="store.filtered.length === 0" icon="notes" title="No notes" body="Create one on the right." />

        <ul class="mt-3 space-y-2 max-h-[calc(100vh-15rem)] overflow-y-auto pr-1">
          <li v-for="n in store.filtered" :key="n.id">
            <button
              @click="open(n)"
              :class="['w-full text-left rounded-xl border p-3 transition-shadow hover:shadow-card',
                       active?.id === n.id ? 'border-brand-400 ring-1 ring-brand-300' : 'border-surface-border dark:border-night-700']"
              :style="{ background: n.color ?? '#ffffff' + (n.color === '#ffffff' ? '' : '55') }">
              <div class="flex items-center gap-2">
                <Icon v-if="n.is_pinned" name="pin" :size="14" class="text-brand-600" />
                <div class="font-medium text-sm truncate flex-1 text-night-900">{{ n.title || 'Untitled' }}</div>
              </div>
              <p class="text-xs text-night-700 line-clamp-2 mt-0.5">{{ n.body }}</p>
              <div class="mt-1.5 flex items-center gap-1 text-[10px] text-night-500">
                <span>{{ fmtDate(n.updated_at, { month:'short', day:'numeric' }) }}</span>
                <span v-if="n.tags.length" class="ml-auto">#{{ n.tags.slice(0,2).join(' #') }}</span>
              </div>
            </button>
          </li>
        </ul>
      </div>

      <!-- editor -->
      <Card v-if="active" padded class="!p-4">
        <div class="flex items-center gap-2 mb-3">
          <button
            :class="['h-9 w-9 rounded-lg border grid place-items-center transition-colors',
                     draft.is_pinned ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-surface-border dark:border-night-700 text-night-500']"
            @click="draft.is_pinned = !draft.is_pinned" aria-label="Pin">
            <Icon name="pin" :size="16" />
          </button>
          <div class="flex-1"></div>
          <div class="flex items-center gap-1">
            <button v-for="c in ['#ffffff','#fff1c4','#fee2e2','#dcfce7','#dbeafe','#ede9fe','#fce7f3','#e2e8f0']" :key="c"
                    class="h-6 w-6 rounded-full border border-black/10 ring-offset-1"
                    :class="draft.color === c ? 'ring-2 ring-brand-500' : ''"
                    :style="{ background: c }" @click="draft.color = c" />
          </div>
          <Button variant="ghost" size="sm" @click="remove"><Icon name="trash" :size="16" /></Button>
        </div>

        <input v-model="draft.title"
               placeholder="Note title"
               class="w-full bg-transparent border-0 outline-none text-2xl font-bold placeholder:text-night-300" />

        <Textarea v-model="draft.body" :rows="14" placeholder="Start typing… Markdown-ish supported.
- lists work
- so do numbers
**bold** _italic_" />

        <div class="mt-3 flex items-center flex-wrap gap-2">
          <span v-for="t in draft.tags" :key="t" class="chip cursor-pointer" @click="removeTag(t)">#{{ t }} ✕</span>
          <div class="flex items-center gap-2">
            <Input v-model="draft.newTag" placeholder="add tag" @keydown.enter.prevent="addTag" input-class="!py-1.5" />
            <Button size="sm" variant="secondary" @click="addTag">Add</Button>
          </div>
        </div>
        <p class="mt-2 text-xs text-night-500">Auto-saves as you type.</p>
      </Card>

      <EmptyState v-else icon="edit" title="No note selected"
                  body="Pick one from the list, or create a new note." />
    </div>
  </div>
</template>
