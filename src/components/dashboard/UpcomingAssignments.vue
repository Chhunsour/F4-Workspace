<script setup lang="ts">
import { computed } from 'vue'
import { useAssignmentsStore } from '@/stores/assignments'
import { useSubjectsStore } from '@/stores/subjects'
import { fmtDate, humanCountdown } from '@/lib/utils'
import { PRIORITY_LABELS } from '@/types'
import Card from '@/components/ui/Card.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { RouterLink } from 'vue-router'
import Badge from '@/components/ui/Badge.vue'
import { useNow } from '@/composables/useCountdown'

const assignments = useAssignmentsStore()
const subjects = useSubjectsStore()
const now = useNow()

const items = computed(() => assignments.upcoming.slice(0,5))
function dueDate(a: any): Date | null {
  if (!a.due_date) return null
  return new Date(`${a.due_date}T${a.due_time ?? '23:59'}:00`)
}
</script>

<template>
  <Card>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="font-semibold">Upcoming assignments</h3>
        <p class="text-xs text-night-500">
          {{ assignments.overdueCount ? assignments.overdueCount + ' overdue · ' : '' }}
          {{ items.length }} due soon
        </p>
      </div>
      <RouterLink to="/assignments" class="text-xs link">All →</RouterLink>
    </div>

    <EmptyState v-if="items.length === 0" icon="check" title="Nothing due" body="Nice. Enjoy the silence." />

    <ul v-else class="divide-y divide-surface-border dark:divide-night-700">
      <li v-for="a in items" :key="a.id" class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
        <button class="h-5 w-5 rounded-full border-2 border-night-300 dark:border-night-500 hover:border-brand-500 transition-colors shrink-0"
          @click="assignments.toggleComplete(a.id)" aria-label="Toggle done" />
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">{{ a.title }}</div>
          <div class="text-xs text-night-500 truncate">
            <span v-if="subjects.byId(a.subject_id)">{{ subjects.byId(a.subject_id)!.name }} · </span>
            <span v-if="dueDate(a)">
              {{ fmtDate(a.due_date, { month:'short', day:'numeric' }) }}
              <span :class="dueDate(a)! < now ? 'text-red-500 font-medium' : ''">
                · {{ dueDate(a)! < now ? 'overdue' : 'in ' + humanCountdown(dueDate(a)!, now) }}
              </span>
            </span>
          </div>
        </div>
        <Badge :tone="PRIORITY_LABELS[a.priority].tone">{{ PRIORITY_LABELS[a.priority].label }}</Badge>
      </li>
    </ul>
  </Card>
</template>
