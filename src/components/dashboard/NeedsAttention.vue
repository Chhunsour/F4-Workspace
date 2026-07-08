<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAssignmentsStore } from '@/stores/assignments'
import { useProjectsStore } from '@/stores/projects'
import { useSubjectsStore } from '@/stores/subjects'
import { useNow } from '@/composables/useCountdown'
import { fmtDate, humanCountdown, dueLabel } from '@/lib/utils'
import { PRIORITY_LABELS } from '@/types'
import type { Assignment } from '@/types'
import Badge from '@/components/ui/Badge.vue'
import Icon from '@/components/ui/Icon.vue'

const assignments = useAssignmentsStore()
const projects = useProjectsStore()
const subjects = useSubjectsStore()
const now = useNow()

function dueDate(a: Assignment): Date | null {
  return a.due_date ? new Date(`${a.due_date}T${a.due_time ?? '23:59'}:00`) : null
}

const overdue = computed(() =>
  assignments.upcoming.filter(a => (dueDate(a) ?? now.value) < now.value))
const upcoming = computed(() =>
  assignments.upcoming.filter(a => !((dueDate(a) ?? now.value) < now.value)).slice(0, 5))
const deadlines = computed(() => projects.upcomingDeadlines.slice(0, 3))

const allClear = computed(() =>
  !overdue.value.length && !upcoming.value.length && !deadlines.value.length)
</script>

<template>
  <section>
    <div class="mb-3 flex items-center justify-between">
      <h3 class="t-section">Needs attention</h3>
      <RouterLink to="/assignments" class="link text-xs">All tasks →</RouterLink>
    </div>

    <div v-if="allClear" class="py-6 text-center">
      <p class="text-sm font-medium text-night-700 dark:text-night-100">All clear</p>
      <p class="mt-1 text-xs text-night-500 dark:text-night-300">
        Nothing overdue, nothing due soon.
        <RouterLink to="/assignments?new=1" class="link">Add a task</RouterLink> when the workload returns.
      </p>
    </div>

    <template v-else>
      <ul v-if="overdue.length || upcoming.length" class="divide-y divide-surface-border dark:divide-night-700">
        <li v-for="a in [...overdue, ...upcoming]" :key="a.id" class="flex items-center gap-3 py-2.5 first:pt-0">
          <button class="relative after:absolute after:-inset-1.5 after:content-[''] h-6 w-6 shrink-0 rounded-full border-2 border-night-300 transition-colors hover:border-brand-500 dark:border-night-500"
                  aria-label="Mark done" @click="assignments.toggleComplete(a.id)" />
          <RouterLink :to="`/assignments?id=${a.id}`" class="min-w-0 flex-1">
            <div class="truncate font-medium">{{ a.title }}</div>
            <div class="truncate text-xs text-night-500 dark:text-night-300">
              <span v-if="subjects.byId(a.subject_id)">{{ subjects.byId(a.subject_id)!.name }} · </span>
              <template v-if="dueDate(a)">
                {{ fmtDate(a.due_date!, { month:'short', day:'numeric' }) }}
                <span :class="dueDate(a)! < now ? 'font-semibold text-red-500' : ''">
                  · {{ dueLabel(dueDate(a)!, now) }}
                </span>
              </template>
            </div>
          </RouterLink>
          <Badge v-if="dueDate(a)! < now" tone="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200">Overdue</Badge>
          <Badge v-else-if="a.priority !== 'normal'" :tone="PRIORITY_LABELS[a.priority].tone">{{ PRIORITY_LABELS[a.priority].label }}</Badge>
        </li>
      </ul>

      <div v-if="deadlines.length" :class="overdue.length || upcoming.length ? 'mt-3 border-t border-surface-border pt-3 dark:border-night-700' : ''">
        <p class="t-section mb-2">Project deadlines</p>
        <ul class="space-y-1">
          <li v-for="p in deadlines" :key="p.id">
            <RouterLink :to="`/projects/${p.id}`"
                        class="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-night-50 dark:hover:bg-night-700/50">
              <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-semibold text-white"
                    :style="{ background: p.color ?? '#3a68ff' }">
                {{ p.name.slice(0,1).toUpperCase() }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium">{{ p.name }}</div>
                <div class="truncate text-xs text-night-500 dark:text-night-300">
                  Due {{ fmtDate(p.deadline!) }} · {{ humanCountdown(new Date(p.deadline!), now) }} left · {{ p.progress }}%
                </div>
              </div>
              <Icon name="chevron_right" :size="14" class="shrink-0 text-night-400" />
            </RouterLink>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
