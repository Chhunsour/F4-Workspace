<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useNotesStore } from '@/stores/notes'
import { useSubjectsStore } from '@/stores/subjects'
import { debounce, fmtDate } from '@/lib/utils'
import { NOTE_COLORS } from '@/types'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import Textarea from '@/components/ui/Textarea.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import type { Note } from '@/types'
import { useI18n } from '@/composables/useI18n'

const store = useNotesStore()
const subjects = useSubjectsStore()
const route = useRoute(); const router = useRouter()
const toast = useToast(); const confirm = useConfirm()
const { t } = useI18n()

const active = ref<Note | null>(null)
const draft = ref<{ title: string; body: string; color: string; tags: string[]; is_pinned: boolean; newTag: string; subject_id: string | null }>({
  title: '', body: '', color: '#ffffff', tags: [], is_pinned: false, newTag: '', subject_id: null,
})

const { error, loading, load } = useLoad(async () => {
  await Promise.all([store.fetch(), subjects.fetch()])
  if (route.query.subject && route.query.new !== '1') store.activeSubject = String(route.query.subject)
  const wanted = route.query.id as string | undefined
  if (wanted) open(store.items.find(n => n.id === wanted) ?? null)
  else if (route.query.new === '1') await createBlank()
})
watch(() => route.query.new, n => { if (n === '1') createBlank() })

// Snapshot of the last loaded/saved draft — loading a note into the form
// must not count as an edit (no "Saving…" flash, no redundant write).
let snapshot = ''
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')

function open(n: Note | null) {
  active.value = n
  saveState.value = 'idle'
  if (n) {
    draft.value = { title: n.title ?? '', body: n.body, color: n.color ?? '#ffffff', tags: [...n.tags], is_pinned: n.is_pinned, newTag: '', subject_id: n.subject_id }
    snapshot = JSON.stringify(draft.value)
  }
}
async function createBlank() {
  // /notes?new=1&subject=X starts the note already linked to that subject
  const subject_id = route.query.subject ? String(route.query.subject) : null
  const n = await store.create({ title: '', body: '', color: NOTE_COLORS[0], subject_id })
  open(n)
  if (route.query.new) router.replace({ query: { ...route.query, new: undefined, subject: undefined, id: n.id } })
}

const persist = debounce(async () => {
  if (!active.value) return
  await store.update(active.value.id, {
    title: draft.value.title || null,
    body: draft.value.body,
    color: draft.value.color,
    tags: draft.value.tags,
    is_pinned: draft.value.is_pinned,
    subject_id: draft.value.subject_id,
  })
  saveState.value = 'saved'
}, 500)
watch(() => JSON.stringify(draft.value), (v) => {
  if (!active.value || v === snapshot) return
  snapshot = v
  saveState.value = 'saving'
  persist()
})

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
  const ok = await confirm.ask({ title: t('Delete note?'), destructive: true, confirmLabel: t('Delete') })
  if (!ok) return
  await store.remove(active.value.id)
  toast.success(t('Note deleted'))
  active.value = null
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-2xl font-semibold">{{ t('Notes') }}</h2>
        <p class="text-sm text-night-500">{{ t('{count} notes', { count: store.items.length }) }}</p>
      </div>
      <Button @click="createBlank"><Icon name="plus" :size="16" /> {{ t('New note') }}</Button>
    </div>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Skeleton height="h-64" rounded="rounded-xl" />
      <Skeleton height="h-64" rounded="rounded-xl" />
    </div>
    <div v-else class="grid gap-4 lg:grid-cols-[320px_1fr]">
      <!-- list (on mobile, hidden while a note is open so the editor gets the full screen) -->
      <div :class="active ? 'hidden lg:block' : ''">
        <Card padded class="!p-3">
          <div class="space-y-2">
            <Input v-model="store.q" :placeholder="t('Search notes…')" />
            <div v-if="subjects.items.length" class="flex flex-wrap gap-1.5">
              <button v-for="su in subjects.items" :key="su.id"
                @click="store.activeSubject = store.activeSubject === su.id ? '' : su.id"
                :class="['chip transition-colors inline-flex items-center gap-1.5', store.activeSubject === su.id ? '!bg-brand-600 !text-white' : '']">
                <span class="h-2 w-2 rounded-full" :style="{ background: su.color }" /> {{ su.name }}
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="t in store.tags" :key="t"
                @click="store.activeTag = store.activeTag === t ? '' : t"
                :class="['chip transition-colors', store.activeTag === t ? '!bg-brand-600 !text-white' : '']">
                #{{ t }}
              </button>
            </div>
          </div>
        </Card>

        <EmptyState v-if="store.filtered.length === 0" icon="notes" :title="t('No notes')" :body="t('Create one on the right.')" />

        <ul class="mt-3 space-y-2 max-h-[calc(100vh-15rem)] overflow-y-auto pr-1">
          <li v-for="n in store.filtered" :key="n.id">
            <button
              @click="open(n)"
              :class="['w-full text-left rounded-xl border p-3 transition-shadow hover:shadow-card',
                       active?.id === n.id ? 'border-brand-400 ring-1 ring-brand-300' : 'border-surface-border dark:border-night-700']"
              :style="{ background: n.color ?? '#ffffff' + (n.color === '#ffffff' ? '' : '55') }">
              <div class="flex items-center gap-2">
                <Icon v-if="n.is_pinned" name="pin" :size="14" class="text-brand-600" />
                <div class="font-medium text-sm truncate flex-1 text-night-900">{{ n.title || t('Untitled') }}</div>
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
          <button class="lg:hidden -ml-1 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-night-500 hover:text-night-900 dark:text-night-300 dark:hover:text-white"
                  @click="active = null">
            <Icon name="chevron_left" :size="16" /> {{ t('Notes') }}
          </button>
          <button
            :class="['h-9 w-9 rounded-lg border grid place-items-center transition-colors',
                     draft.is_pinned ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-surface-border dark:border-night-700 text-night-500']"
            @click="draft.is_pinned = !draft.is_pinned" :aria-label="t('Pin')">
            <Icon name="pin" :size="16" />
          </button>
          <div class="flex-1"></div>
          <div class="flex items-center gap-1">
            <button v-for="(c, ci) in ['#ffffff','#fff1c4','#fee2e2','#dcfce7','#dbeafe','#ede9fe','#fce7f3','#e2e8f0']" :key="c"
                    class="h-7 w-7 rounded-full border border-black/10 ring-offset-1"
                    :class="draft.color === c ? 'ring-2 ring-brand-500' : ''"
                    :style="{ background: c }" :aria-label="t('Note color {number}', { number: ci + 1 })"
                    :aria-pressed="draft.color === c" @click="draft.color = c" />
          </div>
          <Button variant="ghost" size="sm" :aria-label="t('Delete note')" @click="remove"><Icon name="trash" :size="16" /></Button>
        </div>

        <input v-model="draft.title"
               :placeholder="t('Note title')"
               class="w-full bg-transparent border-0 outline-none text-2xl font-bold placeholder:text-night-300" />

        <Textarea v-model="draft.body" :rows="14" :placeholder="t('Start typing… Markdown-ish supported.\n- lists work\n- so do numbers\n**bold** _italic_')" />

        <div class="mt-3 flex items-center flex-wrap gap-2">
          <Select :model-value="draft.subject_id" :options="subjects.options" :placeholder="t('No subject')"
                  class="w-48" :aria-label="t('Subject')"
                  @update:model-value="(v: string) => draft.subject_id = v || null" />
          <button v-for="tag in draft.tags" :key="tag" type="button" class="chip cursor-pointer hover:text-red-500 transition-colors" @click="removeTag(tag)" :aria-label="t('Remove tag {tag}', { tag })">#{{ tag }} <Icon name="close" :size="11" /></button>
          <div class="flex items-center gap-2">
            <Input v-model="draft.newTag" :placeholder="t('add tag')" @keydown.enter.prevent="addTag" input-class="!py-1.5" />
            <Button size="sm" variant="secondary" @click="addTag">{{ t('Add') }}</Button>
          </div>
        </div>
        <p class="mt-2 text-xs text-night-500" aria-live="polite">
          {{ saveState === 'saving' ? t('Saving…') : saveState === 'saved' ? t('Saved') : t('Auto-saves as you type.') }}
        </p>
      </Card>

      <EmptyState v-else icon="edit" :title="t('No note selected')"
                  :body="t('Pick one from the list, or create a new note.')" />
    </div>
  </div>
</template>
