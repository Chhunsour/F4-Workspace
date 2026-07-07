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

const props = defineProps<{ open: boolean; editing?: Memory | null }>()
const emit  = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const mem = useMemoriesStore()
const subjects = useSubjectsStore()
const groups = useGroupsStore()
const toast = useToast()
const confirm = useConfirm()

const form = reactive({
  title: '', caption: '', event_date: '',
  album: '', subject_id: null as string | null, group_id: null as string | null,
})
const files = ref<File[]>([])
const uploading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => [props.open, props.editing], () => {
  if (props.editing) {
    Object.assign(form, {
      title: props.editing.title ?? '', caption: props.editing.caption ?? '',
      event_date: props.editing.event_date ?? '', album: props.editing.album ?? '',
      subject_id: props.editing.subject_id, group_id: props.editing.group_id,
    })
  } else {
    Object.assign(form, { title: '', caption: '', event_date: todayIso(), album: '', subject_id: null, group_id: null })
    files.value = []
  }
}, { immediate: true })

const subjectOptions = computed(() => subjects.items.map(s => ({ value: s.id, label: s.name })))
const groupOptions = computed(() => groups.items.map(g => ({ value: g.id, label: g.name })))
const totalMb = computed(() => (files.value.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1))

function pick() { inputRef.value?.click() }
function onPick(e: Event) {
  const list = (e.target as HTMLInputElement).files
  if (!list) return
  files.value = [...files.value, ...Array.from(list)]
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
        subject_id: form.subject_id, group_id: form.group_id,
      })
    } else {
      memory = await mem.create({
        title: form.title || null, caption: form.caption || null,
        event_date: form.event_date || null, album: form.album || null,
        subject_id: form.subject_id, group_id: form.group_id,
      })
    }
    if (files.value.length) {
      await mem.uploadImages(memory.id, files.value)
    }
    toast.success(props.editing ? 'Memory updated' : 'Memory added')
    emit('update:open', false)
  } catch (e: any) { toast.error('Could not save', e?.message) }
  finally { uploading.value = false }
}

async function remove() {
  if (!props.editing) return
  const ok = await confirm.ask({ title: 'Delete memory?', body: 'All images will be removed.', destructive: true, confirmLabel: 'Delete' })
  if (!ok) return
  await mem.remove(props.editing.id)
  toast.success('Memory removed')
  emit('update:open', false)
}
</script>

<template>
  <Modal :open="props.open" @update:open="v => emit('update:open', v)" wide :title="props.editing ? 'Edit memory' : 'New memory'">
    <form class="space-y-4" @submit.prevent="save">
      <Input v-model="form.title" label="Title" placeholder="e.g. Project night before deadline" />
      <Textarea v-model="form.caption" label="Caption" :rows="2" placeholder="Say something you'll want to remember." />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input v-model="form.event_date" type="date" label="Date" />
        <Input v-model="form.album" label="Album" placeholder="e.g. Class Moments" />
        <Select v-model="form.subject_id" :options="subjectOptions" label="Subject" placeholder="No subject" />
        <Select v-model="form.group_id" :options="groupOptions" label="Group" placeholder="Just for me" />
      </div>

      <div v-if="!props.editing || files.length" class="rounded-xl border-2 border-dashed border-surface-border dark:border-night-700 p-4 text-center">
        <input ref="inputRef" type="file" accept="image/*" multiple class="hidden" @change="onPick" />
        <p class="text-sm text-night-500">Add photos (they'll be compressed to save storage).</p>
        <Button type="button" variant="secondary" size="sm" class="mt-2" @click="pick"><Icon name="camera" :size="16" /> Choose photos</Button>
        <div v-if="files.length" class="mt-3 flex flex-wrap gap-2 justify-center">
          <div v-for="(f, i) in files" :key="i" class="relative">
            <img :src="preview(f)" class="h-16 w-16 object-cover rounded-lg" />
            <button class="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px]" @click="removeFile(i)" type="button">✕</button>
          </div>
        </div>
        <p v-if="files.length" class="mt-2 text-xs text-night-500">{{ files.length }} file(s), {{ totalMb }} MB</p>
      </div>
    </form>
    <template #footer>
      <Button v-if="props.editing" variant="danger" size="sm" @click="remove">Delete</Button>
      <div class="flex-1" />
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
      <Button size="sm" :loading="uploading" @click="save">{{ props.editing ? 'Save' : 'Add memory' }}</Button>
    </template>
  </Modal>
</template>
