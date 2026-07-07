<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { fmtDate } from '@/lib/utils'
import type { ProjectTask } from '@/types'

const props = defineProps<{ task: ProjectTask }>()
defineEmits<{ (e: 'edit', t: ProjectTask): void; (e: 'move', t: ProjectTask, next: ProjectTask['status']): void }>()

const checklistDone = computed(() => props.task.checklist.filter(c => c.done).length)
const checklistTotal = computed(() => props.task.checklist.length)
</script>

<template>
  <div class="rounded-xl border border-surface-border dark:border-night-700 bg-white dark:bg-night-800 p-3 hover:shadow-cardH transition-shadow cursor-pointer group"
       @click="$emit('edit', task)">
    <div class="flex items-start gap-2">
      <div class="flex-1 min-w-0">
        <div class="font-medium text-sm">{{ task.title }}</div>
        <p v-if="task.description" class="text-xs text-night-500 line-clamp-2 mt-0.5">{{ task.description }}</p>
      </div>
    </div>
    <div v-if="checklistTotal > 0 || task.due_date" class="mt-2 flex items-center gap-2 text-[11px] text-night-500 flex-wrap">
      <span v-if="checklistTotal > 0" class="inline-flex items-center gap-1"><Icon name="check" :size="10" /> {{ checklistDone }}/{{ checklistTotal }}</span>
      <span v-if="task.due_date" class="inline-flex items-center gap-1"><Icon name="clock" :size="10" /> {{ fmtDate(task.due_date, { month:'short', day:'numeric' }) }}</span>
    </div>
    <div class="mt-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button v-if="task.status !== 'todo'" class="text-[11px] text-night-500 hover:text-night-900 dark:hover:text-white"
              @click.stop="$emit('move', task, previousStatus(task.status))">← back</button>
      <button v-if="task.status !== 'completed'" class="text-[11px] text-night-500 hover:text-night-900 dark:hover:text-white"
              @click.stop="$emit('move', task, nextStatus(task.status))">next →</button>
    </div>
  </div>
</template>

<script lang="ts">
const ORDER = ['todo','in_progress','review','completed'] as const
function nextStatus(s: any) { const i = ORDER.indexOf(s); return ORDER[Math.min(ORDER.length-1, i+1)] }
function previousStatus(s: any) { const i = ORDER.indexOf(s); return ORDER[Math.max(0, i-1)] }
</script>
