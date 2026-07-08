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

    <div v-if="allClear" class="rounded-2xl border border-grass-500/25 bg-grass-500/8 dark:bg-grass-500/12 px-4 py-6 text-center">
      <div class="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-grass-500/20 text-grass-600 dark:text-grass-300">
        <Icon name="check" :size="18" />
      </div>
      <p class="text-[15px] font-semibold text-night-900 dark:text-white">All clear</p>
      <p class="mt-1 text-xs text-night-600 dark:text-night-100">
        Nothing overdue, nothing due soon.
        <RouterLink to="/assignments?new=1" class="link">Add a task</RouterLink> when the workload returns.
      </p>
    </div>

    <template v-else>
      <ul v-if="overdue.length || upcoming.length" class="space-y-1">
        <li v-for="a in [...overdue, ...upcoming]" :key="a.id"
            class="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-brand-500/6 dark:hover:bg-brand-400/10">
          <button class="relative after:absolute after:-inset-1.5 after:content-[''] h-6 w-6 shrink-0 rounded-full border-2 border-night-300 dark:border-night-500 transition-all hover:border-brand-500 hover:bg-brand-500/10"
                  aria-label="Mark done" @click="assignments.toggleComplete(a.id)" />
          <RouterLink :to="`/assignments?id=${a.id}`" class="min-w-0 flex-1">
            <div class="truncate text-[14px] font-medium text-night-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-200 transition-colors">{{ a.title }}</div>
            <div class="truncate text-xs text-night-500 dark:text-night-200">
              <span v-if="subjects.byId(a.subject_id)">{{ subjects.byId(a.subject_id)!.name }} · </span>
              <template v-if="dueDate(a)">
                {{ fmtDate(a.due_date!, { month:'short', day:'numeric' }) }}
                <span :class="dueDate(a)! < now ? 'font-semibold text-red-600 dark:text-red-300' : ''">
                  · {{ dueLabel(dueDate(a)!, now) }}
                </span>
              </template>
            </div>
          </RouterLink>
          <span v-if="dueDate(a)! < now" class="chip-danger shrink-0">Overdue</span>
          <Badge v-else-if="a.priority !== 'normal'" :tone="PRIORITY_LABELS[a.priority].tone">{{ PRIORITY_LABELS[a.priority].label }}</Badge>
        </li>
      </ul>

      <div v-if="deadlines.length" :class="overdue.length || upcoming.length ? 'mt-4 border-t border-[var(--card-border)] pt-3' : ''">
        <p class="t-section mb-2">Project deadlines</p>
        <ul class="space-y-1">
          <li v-for="p in deadlines" :key="p.id">
            <RouterLink :to="`/projects/${p.id}`"
                        class="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-brand-500/6 dark:hover:bg-brand-400/10">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-bold text-white ring-2 ring-white dark:ring-night-800"
                    :style="{ background: p.color ?? '#5B7BD4' }">
                {{ p.name.slice(0,1).toUpperCase() }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-night-900 dark:text-white">{{ p.name }}</div>
                <div class="truncate text-xs text-night-500 dark:text-night-200">
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
