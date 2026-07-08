<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { fmtDate } from '@/lib/utils'
import type { ProjectTask } from '@/types'

const props = defineProps<{
  task: ProjectTask
  /** display name of the assignee, resolved by the parent */
  assigneeName?: string | null
}>()
defineEmits<{ (e: 'edit', t: ProjectTask): void; (e: 'move', t: ProjectTask, next: ProjectTask['status']): void }>()

const checklistDone = computed(() => props.task.checklist.filter(c => c.done).length)
const checklistTotal = computed(() => props.task.checklist.length)
</script>

<template>
  <div class="tile tile-hover p-3 cursor-pointer" @click="$emit('edit', task)">
    <div class="flex items-start gap-2">
      <div class="flex-1 min-w-0">
        <div class="font-medium text-sm text-night-900 dark:text-night-50">{{ task.title }}</div>
        <p v-if="task.description" class="text-xs text-night-500 dark:text-night-300 line-clamp-2 mt-0.5">{{ task.description }}</p>
      </div>
      <Avatar v-if="assigneeName" :name="assigneeName" size="sm" :title="assigneeName" class="shrink-0" />
    </div>

    <div class="mt-2 flex items-center gap-2 text-[11px] text-night-500 dark:text-night-300">
      <span v-if="checklistTotal > 0" class="inline-flex items-center gap-1"><Icon name="check" :size="10" /> {{ checklistDone }}/{{ checklistTotal }}</span>
      <span v-if="task.due_date" class="inline-flex items-center gap-1"><Icon name="clock" :size="10" /> {{ fmtDate(task.due_date, { month:'short', day:'numeric' }) }}</span>

      <!-- Always-visible move controls — hover-only was invisible on touch -->
      <span class="ml-auto flex items-center gap-1">
        <button v-if="task.status !== 'todo'"
                class="grid h-8 w-8 place-items-center rounded-lg text-night-400 hover:text-night-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                :aria-label="'Move back'"
                @click.stop="$emit('move', task, previousStatus(task.status))">
          <Icon name="chevron_left" :size="15" />
        </button>
        <button v-if="task.status !== 'completed'"
                class="grid h-8 w-8 place-items-center rounded-lg text-night-400 hover:text-night-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                :aria-label="'Move forward'"
                @click.stop="$emit('move', task, nextStatus(task.status))">
          <Icon name="chevron_right" :size="15" />
        </button>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
const ORDER = ['todo','in_progress','completed'] as const
const norm = (s: any) => s === 'review' ? 'in_progress' : s
function nextStatus(s: any) { const i = ORDER.indexOf(norm(s)); return ORDER[Math.min(ORDER.length-1, i+1)] }
function previousStatus(s: any) { const i = ORDER.indexOf(norm(s)); return ORDER[Math.max(0, i-1)] }
</script>
