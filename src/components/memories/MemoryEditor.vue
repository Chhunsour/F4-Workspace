<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import { useMemoriesStore } from '@/stores/memories'
import { useSubjectsStore } from '@/stores/subjects'
import { useGroupsStore } from '@/stores/groups'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { todayIso } from '@/lib/utils'
import type { Memory } from '@/types'
import { useI18n } from '@/composables/useI18n'
import { supabase } from '@/lib/supabase'

const props = defineProps<{ open: boolean; editing?: Memory | null; defaultAlbum?: string }>()
const emit  = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const mem = useMemoriesStore()
const subjects = useSubjectsStore()
const groups = useGroupsStore()
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
const progress = ref({ done: 0, total: 0 })
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => [props.open, props.editing], () => {
  if (props.editing) {
    Object.assign(form, {
      title: props.editing.title ?? '', caption: props.editing.caption ?? '',
      event_date: props.editing.event_date ?? '', album: props.editing.album ?? '',
      subject_id: props.editing.subject_id, group_id: props.editing.group_id,
      tagged_users: props.editing.tagged_users ?? [],
    })
  } else {
    Object.assign(form, { title: '', caption: '', event_date: todayIso(), album: props.defaultAlbum ?? '', subject_id: null, group_id: null, tagged_users: [] })
    files.value = []
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
        title: form.title || null, caption: form.caption || null,
        event_date: form.event_date || null, album: form.album || null,
        subject_id: form.subject_id, group_id: form.group_id, tagged_users: form.tagged_users,
      })
    } else {
      memory = await mem.create({
        title: form.title || null, caption: form.caption || null,
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
      <Input v-model="form.title" :label="t('Title')" placeholder="e.g. Project night before deadline" />
      <Textarea v-model="form.caption" :label="t('Caption')" :rows="2" :placeholder="t('Say something you\'ll want to remember.')" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input v-model="form.event_date" type="date" :label="t('Date')" />
        <Input v-model="form.album" :label="t('Album')" placeholder="e.g. Class Moments" />
        <Select v-model="form.subject_id" :options="subjectOptions" :label="t('Subject')" :placeholder="t('No subject')" />
        <Select v-model="form.group_id" :options="groupOptions" :label="t('Group')" :placeholder="t('Just for me')" />
      </div>
      <div v-if="profiles.length" class="space-y-2">
        <p class="t-label">{{ t('Tag Friends') }}</p>
        <div class="flex max-h-24 flex-wrap gap-2 overflow-y-auto">
          <label v-for="profile in profiles" :key="profile.id"
                 :class="['chip cursor-pointer transition-colors',
                          form.tagged_users.includes(profile.id) && '!bg-brand-600 !text-white']">
            <input v-model="form.tagged_users" type="checkbox" :value="profile.id" class="sr-only" />
            {{ profile.full_name || t('Friend') }}
          </label>
        </div>
      </div>

      <div
        v-if="!props.editing || files.length"
        :class="['rounded-2xl border-2 border-dashed p-5 text-center transition-colors',
                 dragOver ? 'border-brand-500 bg-brand-500/10' : 'border-surface-border dark:border-night-700']"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <input ref="inputRef" type="file" accept="image/*" capture="environment" multiple class="hidden" @change="onPick" />
        <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
          <Icon name="camera" :size="22" />
        </div>
        <p class="text-sm font-medium text-night-800 dark:text-night-50">{{ t('Drop photos here or choose from your device') }}</p>
        <p class="mt-1 text-xs text-night-500">{{ t("Add photos (they'll be compressed to save storage).") }}</p>
        <Button type="button" variant="secondary" size="sm" class="mt-3" @click="pick"><Icon name="camera" :size="16" /> {{ t('Choose photos') }}</Button>
        <div v-if="files.length" class="mt-3 flex flex-wrap gap-2 justify-center">
          <div v-for="(f, i) in files" :key="i" class="relative">
            <img :src="preview(f)" class="h-16 w-16 object-cover rounded-lg" />
            <button class="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-white" @click="removeFile(i)" type="button" :aria-label="t('Remove photo')"><Icon name="close" :size="11" /></button>
          </div>
        </div>
        <p v-if="files.length" class="mt-2 text-xs text-night-500">{{ files.length }} file(s), {{ totalMb }} MB</p>
        <div v-if="uploading && progress.total" class="mt-3">
          <div class="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-night-100 dark:bg-night-700">
            <div class="h-full rounded-full bg-brand-600 transition-all" :style="{ width: `${Math.round(progress.done / progress.total * 100)}%` }" />
          </div>
          <p class="mt-1 text-xs text-night-500">{{ t('Uploading {done} of {total}', progress) }}</p>
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
