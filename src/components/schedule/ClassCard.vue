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

const color = computed(() => props.subject?.color ?? '#3a68ff')
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
    :class="['group relative block w-full overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-left',
             'transition-shadow hover:z-10 hover:shadow-cardH',
             'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
             live && 'z-10 ring-2 ring-brand-500/70']"
    :style="{ borderLeftColor: color, backgroundColor: color + '1a' }"
    :aria-label="`${name}, ${time}${meta ? ', ' + meta : ''}. Edit class`"
    @click="$emit('click')"
  >
    <span v-if="live"
          class="absolute right-1.5 top-1.5 rounded-full bg-accent-300 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-night-900">
      Now
    </span>
    <div class="truncate text-[13px] font-semibold leading-tight text-night-900 dark:text-night-50">{{ name }}</div>
    <div v-if="subject?.code" class="truncate text-[11px] font-medium text-night-500 dark:text-night-300">{{ subject.code }}</div>
    <div class="mt-0.5 truncate text-[11px] tabular-nums text-night-600 dark:text-night-200">{{ time }}</div>
    <div v-if="meta" class="truncate text-[11px] text-night-500 dark:text-night-300">{{ meta }}</div>
  </button>

  <button
    v-else
    type="button"
    :class="['flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
             'hover:bg-night-50 dark:hover:bg-night-700/50',
             'focus-visible:outline-none focus-visible:bg-night-50 dark:focus-visible:bg-night-700/50',
             live && 'bg-brand-50/60 dark:bg-brand-900/20']"
    :aria-label="`${name}, ${time}${meta ? ', ' + meta : ''}. Edit class`"
    @click="$emit('click')"
  >
    <span class="h-11 w-1 shrink-0 rounded-full" :style="{ background: color }" />
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="truncate font-medium text-night-900 dark:text-night-50">{{ name }}</span>
        <span v-if="subject?.code" class="shrink-0 text-xs text-night-400 dark:text-night-300">{{ subject.code }}</span>
      </div>
      <div class="mt-0.5 truncate text-xs tabular-nums text-night-500 dark:text-night-300">
        {{ time }}<template v-if="meta"> · {{ meta }}</template>
      </div>
    </div>
    <span v-if="live"
          class="shrink-0 rounded-full bg-accent-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-night-900">
      Now
    </span>
    <Icon v-else name="edit" :size="15" class="shrink-0 text-night-300 dark:text-night-400" />
  </button>
</template>
