<script setup lang="ts">
// One-time event on the timetable (exam / final / presentation). Reuses the
// .subject-block look, tinted by the event-type accent, with a small type label.
import { computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { fmtTime } from '@/lib/utils'
import { EVENT_TYPE_META } from '@/types'
import type { AcademicEvent, Subject } from '@/types'
import { useI18n } from '@/composables/useI18n'

const props = withDefaults(defineProps<{
  event: AcademicEvent
  subject?: Subject | null
  variant?: 'block' | 'row'
}>(), { variant: 'block' })
defineEmits<{ (e: 'click'): void }>()
const { t } = useI18n()

const meta = computed(() => EVENT_TYPE_META[props.event.type])
const primary = computed(() => props.event.title || props.subject?.name || t(meta.value.label))
const secondary = computed(() => (props.event.title && props.subject?.name ? props.subject.name : ''))
const time = computed(() =>
  props.event.start_time
    ? fmtTime(props.event.start_time) + (props.event.end_time ? ` – ${fmtTime(props.event.end_time)}` : '')
    : '')
const room = computed(() => (props.event.room ? t('Room {room}', { room: props.event.room }) : ''))
</script>

<template>
  <button
    v-if="variant === 'block'"
    type="button"
    class="subject-block group block w-full px-2.5 py-1.5 text-left focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    :style="{ '--subject': meta.color }"
    @click="$emit('click')"
  >
    <div class="truncate pl-2.5 text-[10px] font-bold uppercase tracking-wide" :style="{ color: meta.color }">
      {{ t(meta.label) }}
    </div>
    <div class="truncate pl-2.5 text-[13px] font-bold leading-tight text-night-900 dark:text-white">{{ primary }}</div>
    <div v-if="time" class="mt-0.5 truncate pl-2.5 text-[11px] font-medium tabular-nums text-night-700 dark:text-night-100">{{ time }}</div>
    <div v-if="room" class="truncate pl-2.5 text-[11px] text-night-600 dark:text-night-200">{{ room }}</div>
  </button>

  <button
    v-else
    type="button"
    class="subject-block group flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none"
    :style="{ '--subject': meta.color }"
    @click="$emit('click')"
  >
    <div class="min-w-0 flex-1 pl-2">
      <div class="text-[10px] font-bold uppercase tracking-wide" :style="{ color: meta.color }">{{ t(meta.label) }}</div>
      <div class="truncate text-[15px] font-bold text-night-900 dark:text-white">{{ primary }}</div>
      <div class="mt-0.5 truncate text-xs font-medium tabular-nums text-night-700 dark:text-night-100">
        <span v-if="secondary">{{ secondary }}</span><span v-if="secondary && (time || room)"> · </span>{{ time }}<template v-if="time && room"> · </template>{{ room }}
      </div>
    </div>
    <Icon name="edit" :size="15" class="shrink-0 text-night-500 dark:text-night-300" />
  </button>
</template>
