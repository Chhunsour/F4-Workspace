<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import DateField from '@/components/ui/DateField.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { useMemoriesStore } from '@/stores/memories'
import { useSubjectsStore } from '@/stores/subjects'
import { useGroupsStore } from '@/stores/groups'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { todayIso } from '@/lib/utils'
import type { Memory } from '@/types'
import { useI18n } from '@/composables/useI18n'
import { supabase, publicUrl } from '@/lib/supabase'

const props = defineProps<{ open: boolean; editing?: Memory | null; defaultAlbum?: string }>()
const emit  = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const mem = useMemoriesStore()
const subjects = useSubjectsStore()
const groups = useGroupsStore()
const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()
const { t } = useI18n()

const form = reactive({
  title: '', caption: '', event_date: '',
  album: '', subject_id: null as string | null, group_id: null as string | null,
  tagged_users: [] as string[],
})
const profiles = ref<{ id: string; full_name: string | null; avatar_url: string | null }[]>([])
const files = ref<File[]>([])
const uploading = ref(false)
const dragOver = ref(false)
const moreOpen = ref(false)   // title / date / album / subject / group / tags fold away
const progress = ref({ done: 0, total: 0 })
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => [props.open, props.editing], () => {
  if (props.editing) {
    Object.assign(form, {
      title: props.editing.title ?? '',
      caption: props.editing.caption ?? '',
      event_date: props.editing.event_date ?? '', album: props.editing.album ?? '',
      subject_id: props.editing.subject_id, group_id: props.editing.group_id,
      tagged_users: props.editing.tagged_users ?? [],
    })
    // Only pop the fold open when the memory actually uses those extras.
    moreOpen.value = !!(props.editing.title || props.editing.album || props.editing.subject_id || props.editing.group_id || (props.editing.tagged_users?.length))
  } else {
    Object.assign(form, { title: '', caption: '', event_date: todayIso(), album: props.defaultAlbum ?? '', subject_id: null, group_id: null, tagged_users: [] })
    files.value = []
    moreOpen.value = false
  }
  progress.value = { done: 0, total: 0 }
}, { immediate: true })

watch(() => props.open, async (open) => {
  if (!open || profiles.value.length) return
  const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name').limit(40)
  profiles.value = (data ?? []) as any
}, { immediate: true })

const subjectOptions = computed(() => subjects.items.map(s => ({ value: s.id, label: s.name })))
const groupOptions = computed(() => groups.items.map(g => ({ value: g.id, label: g.name })))

// Real, taggable people only: drop yourself, skip nameless rows, and collapse
// same-name duplicates (test accounts) so the list is clean.
const tagFriends = computed(() => {
  const seen = new Set<string>()
  const out: typeof profiles.value = []
  for (const p of profiles.value) {
    if (p.id === auth.userId) continue
    const name = (p.full_name ?? '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
})
const avatarUrl = (p: { avatar_url: string | null }) => (p.avatar_url ? publicUrl('avatars', p.avatar_url) : null)
const totalMb = computed(() => (files.value.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1))

function pick() { inputRef.value?.click() }
function onPick(e: Event) {
  const list = (e.target as HTMLInputElement).files
  if (!list) return
  addFiles(Array.from(list))
}
function addFiles(next: File[]) {
  files.value = [...files.value, ...next.filter(f => f.type.startsWith('image/'))]
}
function onDrop(e: DragEvent) {
  dragOver.value = false
  addFiles(Array.from(e.dataTransfer?.files ?? []))
}
function removeFile(i: number) { files.value.splice(i, 1) }
const preview = (f: File) => URL.createObjectURL(f)

async function save() {
  try {
    uploading.value = true
    let memory: Memory
    if (props.editing) {
      memory = await mem.update(props.editing.id, {
        title: form.title.trim() || null,
        caption: form.caption || null,
        event_date: form.event_date || null, album: form.album || null,
        subject_id: form.subject_id, group_id: form.group_id, tagged_users: form.tagged_users,
      })
    } else {
      memory = await mem.create({
        title: form.title.trim() || null,
        caption: form.caption || null,
        event_date: form.event_date || null, album: form.album || null,
        subject_id: form.subject_id, group_id: form.group_id, tagged_users: form.tagged_users,
      })
    }
    if (files.value.length) {
      await mem.uploadImages(memory.id, files.value, (done, total) => {
        progress.value = { done, total }
      })
    }
    toast.success(props.editing ? t('Memory updated') : t('Memory added'))
    emit('update:open', false)
  } catch (e: any) { toast.error(t('Could not save'), e?.message) }
  finally { uploading.value = false }
}

async function remove() {
  if (!props.editing) return
  const ok = await confirm.ask({ title: t('Delete memory?'), body: t('All images will be removed.'), destructive: true, confirmLabel: t('Delete') })
  if (!ok) return
  await mem.remove(props.editing.id)
  toast.success(t('Memory removed'))
  emit('update:open', false)
}
</script>

<template>
  <Modal :open="props.open" @update:open="v => emit('update:open', v)" wide :title="props.editing ? t('Edit memory') : t('New memory')">
    <form class="space-y-4" @submit.prevent="save">
      <!-- Photo composer — the heart of a memory. -->
      <div
        :class="['relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors',
                 dragOver ? 'border-brand-500 bg-brand-500/10' : 'border-surface-border dark:border-night-700']"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <input ref="inputRef" type="file" accept="image/*" capture="environment" multiple class="hidden" @change="onPick" />

        <!-- Empty: one big, inviting target -->
        <button v-if="!files.length" type="button" @click="pick"
                class="flex w-full flex-col items-center justify-center gap-2 px-6 py-10 text-center hover:bg-brand-500/[0.04] transition-colors">
          <span class="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
            <Icon name="camera" :size="26" />
          </span>
          <span class="text-[15px] font-semibold text-night-900 dark:text-white">{{ t('Add photos') }}</span>
          <span class="max-w-xs text-xs text-night-500 dark:text-night-300">{{ t('Drop them here or click to choose — they’ll be compressed to save storage.') }}</span>
        </button>

        <!-- Chosen: clean thumbnail grid + add-more tile -->
        <div v-else class="p-3">
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <div v-for="(f, i) in files" :key="i"
                 class="group relative aspect-square overflow-hidden rounded-xl bg-night-100 dark:bg-night-800">
              <img :src="preview(f)" class="h-full w-full object-cover" />
              <button type="button" @click="removeFile(i)" :aria-label="t('Remove photo')"
                      class="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-night-950/55 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <Icon name="close" :size="12" />
              </button>
            </div>
            <button type="button" @click="pick" :aria-label="t('Add photos')"
                    class="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-surface-border text-night-400 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-night-700">
              <Icon name="plus" :size="22" />
            </button>
          </div>
          <div class="mt-2.5 flex items-center justify-between text-xs text-night-500 dark:text-night-300">
            <span>{{ files.length }} {{ files.length === 1 ? t('photo') : t('photos') }} · {{ totalMb }} MB</span>
            <span v-if="uploading && progress.total" class="tabular-nums">{{ t('Uploading {done} of {total}', progress) }}</span>
          </div>
          <div v-if="uploading && progress.total" class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-night-100 dark:bg-night-700">
            <div class="h-full rounded-full bg-brand-600 transition-all" :style="{ width: `${Math.round(progress.done / progress.total * 100)}%` }" />
          </div>
        </div>
      </div>

      <!-- Caption — the one line you'll want to remember. -->
      <Textarea v-model="form.caption" :label="t('Caption')" :rows="3" :placeholder="t('Say something you’ll want to remember…')" />

      <div class="divider" />

      <!-- Everything else is optional — folded away so adding a memory is fast. -->
      <button type="button"
              class="flex items-center gap-1.5 text-sm font-medium text-night-500 dark:text-night-300 hover:text-night-900 dark:hover:text-white transition-colors"
              @click="moreOpen = !moreOpen">
        <Icon name="chevron_right" :size="14" :class="['transition-transform', moreOpen && 'rotate-90']" />
        {{ t('More details') }}
      </button>

      <div v-if="moreOpen" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DateField v-model="form.event_date" type="date" label="Date" />
          <Input v-model="form.album" :label="t('Album')" placeholder="e.g. Class Moments" />
          <Select v-model="form.subject_id" :options="subjectOptions" :label="t('Subject')" :placeholder="t('No subject')" />
          <Select v-model="form.group_id" :options="groupOptions" :label="t('Group')" :placeholder="t('Just for me')" />
        </div>
        <div v-if="tagFriends.length" class="space-y-2">
          <p class="t-label">{{ t('Tag Friends') }}</p>
          <div class="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1">
            <label v-for="profile in tagFriends" :key="profile.id"
                   :class="['group relative flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 cursor-pointer transition-all',
                            form.tagged_users.includes(profile.id)
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-surface-border dark:border-night-700 hover:border-brand-400/60']">
              <input v-model="form.tagged_users" type="checkbox" :value="profile.id" class="sr-only" />
              <Avatar :src="avatarUrl(profile)" :name="profile.full_name" size="sm" />
              <span :class="['text-[13px] font-medium',
                             form.tagged_users.includes(profile.id)
                               ? 'text-brand-700 dark:text-brand-200'
                               : 'text-night-700 dark:text-night-100']">{{ profile.full_name }}</span>
              <span v-if="form.tagged_users.includes(profile.id)"
                    class="grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white shrink-0">
                <Icon name="check" :size="10" />
              </span>
            </label>
          </div>
        </div>
      </div>
    </form>
    <template #footer>
      <Button v-if="props.editing" variant="danger" size="sm" @click="remove">{{ t('Delete') }}</Button>
      <div class="flex-1" />
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">{{ t('Cancel') }}</Button>
      <Button size="sm" :loading="uploading" @click="save">{{ props.editing ? t('Save') : t('Add memory') }}</Button>
    </template>
  </Modal>
</template>
