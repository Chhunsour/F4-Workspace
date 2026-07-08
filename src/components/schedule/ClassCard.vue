<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { fmtTime } from '@/lib/utils'
import type { ClassSchedule, Subject } from '@/types'

const props = withDefaults(defineProps<{
  item: ClassSchedule
  subject?: Subject | null
  /** 'block' = positioned cell inside the time grid, 'row' = stacked list item (mobile) */
  variant?: 'block' | 'row'
  /** class is happening right now */
  live?: boolean
}>(), { variant: 'block' })

defineEmits<{ (e: 'click'): void }>()

const color = computed(() => props.subject?.color ?? '#5B7BD4')
const name  = computed(() => props.subject?.name ?? 'Unnamed subject')
const time  = computed(() => `${fmtTime(props.item.start_time)} – ${fmtTime(props.item.end_time)}`)
const meta  = computed(() =>
  [props.item.room && `Room ${props.item.room}`, props.subject?.lecturer].filter(Boolean).join(' · ')
)
</script>

<template>
  <button
    v-if="variant === 'block'"
    type="button"
    :class="['subject-block group block w-full text-left px-2.5 py-1.5',
             'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
             live && 'subject-block-now z-10']"
    :style="{ '--subject': color }"
    :aria-label="`${name}, ${time}${meta ? ', ' + meta : ''}. Edit class`"
    @click="$emit('click')"
  >
    <span v-if="live"
          class="absolute right-1.5 top-1.5 chip-live !px-1.5 !py-px !text-[9px] uppercase tracking-wide">
      Now
    </span>
    <div class="flex items-center gap-1.5 pl-2.5">
      <div class="truncate text-[13px] font-bold leading-tight text-night-900 dark:text-white">{{ name }}</div>
    </div>
    <div v-if="subject?.code" class="truncate pl-2.5 text-[11px] font-semibold text-night-600 dark:text-night-100">{{ subject.code }}</div>
    <div class="mt-0.5 truncate pl-2.5 text-[11px] tabular-nums font-medium text-night-700 dark:text-night-100">{{ time }}</div>
    <div v-if="meta" class="truncate pl-2.5 text-[11px] text-night-600 dark:text-night-200">{{ meta }}</div>
  </button>

  <button
    v-else
    type="button"
    :class="['subject-block group flex w-full items-center gap-3 px-4 py-3 text-left',
             'focus-visible:outline-none',
             live && 'subject-block-now']"
    :style="{ '--subject': color }"
    :aria-label="`${name}, ${time}${meta ? ', ' + meta : ''}. Edit class`"
    @click="$emit('click')"
  >
    <div class="min-w-0 flex-1 pl-2">
      <div class="flex items-center gap-2">
        <span class="truncate text-[15px] font-bold text-night-900 dark:text-white">{{ name }}</span>
        <span v-if="subject?.code" class="shrink-0 text-xs font-semibold text-night-600 dark:text-night-100">{{ subject.code }}</span>
      </div>
      <div class="mt-0.5 truncate text-xs tabular-nums font-medium text-night-700 dark:text-night-100">
        {{ time }}<template v-if="meta"> · {{ meta }}</template>
      </div>
    </div>
    <span v-if="live" class="shrink-0 chip-live">Now</span>
    <Icon v-else name="edit" :size="15" class="shrink-0 text-night-500 dark:text-night-300" />
  </button>
</template>
