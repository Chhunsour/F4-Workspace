<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/ui/Modal.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import { useSubjectsStore } from '@/stores/subjects'
import { useAssignmentsStore } from '@/stores/assignments'
import { useNotesStore } from '@/stores/notes'
import { fmtTime, WEEKDAY_LONG } from '@/lib/utils'
import type { ClassSchedule } from '@/types'

const props = defineProps<{ open: boolean; item: ClassSchedule | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'edit', c: ClassSchedule): void }>()

const router = useRouter()
const subjects = useSubjectsStore()
const assignments = useAssignmentsStore()
const notes = useNotesStore()

const subject = computed(() => subjects.byId(props.item?.subject_id))
const openCount = computed(() =>
  assignments.items.filter(a => a.subject_id === props.item?.subject_id && a.status !== 'completed').length)
const noteCount = computed(() =>
  notes.items.filter(n => n.subject_id === props.item?.subject_id).length)

function go(to: string) {
  emit('update:open', false)
  router.push(to)
}
</script>

<template>
  <Modal :open="props.open" :title="subject?.name ?? 'Class'" @update:open="v => emit('update:open', v)">
    <div v-if="props.item" class="space-y-4">
      <div class="flex items-center gap-3">
        <span class="h-10 w-1.5 shrink-0 rounded-full" :style="{ background: subject?.color ?? '#5B7BD4' }" />
        <div class="text-sm">
          <div class="font-medium">
            {{ WEEKDAY_LONG[props.item.weekday] }} · {{ fmtTime(props.item.start_time) }} – {{ fmtTime(props.item.end_time) }}
          </div>
          <div class="text-night-500 dark:text-night-300">
            <span v-if="props.item.room">Room {{ props.item.room }}</span>
            <span v-if="props.item.room && subject?.lecturer"> · </span>
            <span v-if="subject?.lecturer">{{ subject.lecturer }}</span>
          </div>
        </div>
      </div>

      <p v-if="props.item.notes" class="tile p-3 text-sm text-night-700 dark:text-night-100">{{ props.item.notes }}</p>

      <div v-if="subject" class="grid grid-cols-2 gap-2">
        <button class="tile tile-hover p-3 text-left" @click="go(`/subjects/${subject!.id}`)">
          <div class="text-lg font-semibold tabular-nums">{{ openCount }}</div>
          <div class="text-xs text-night-500 dark:text-night-300">assignment{{ openCount === 1 ? '' : 's' }} open</div>
        </button>
        <button class="tile tile-hover p-3 text-left" @click="go(`/notes?subject=${subject!.id}`)">
          <div class="text-lg font-semibold tabular-nums">{{ noteCount }}</div>
          <div class="text-xs text-night-500 dark:text-night-300">note{{ noteCount === 1 ? '' : 's' }}</div>
        </button>
      </div>
    </div>

    <template #footer>
      <Button v-if="props.item" variant="ghost" size="sm" @click="emit('edit', props.item)">
        <Icon name="edit" :size="14" /> Edit
      </Button>
      <div class="flex-1" />
      <Button v-if="subject" variant="secondary" size="sm" @click="go(`/subjects/${subject!.id}`)">Subject page</Button>
      <Button v-if="subject" size="sm" @click="go(`/study?subject=${subject!.id}`)">
        <Icon name="play" :size="14" /> Start study
      </Button>
    </template>
  </Modal>
</template>
