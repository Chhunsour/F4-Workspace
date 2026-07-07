<script setup lang="ts">
import { computed } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { fmtDate, humanCountdown } from '@/lib/utils'
import Card from '@/components/ui/Card.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { RouterLink } from 'vue-router'
import { useNow } from '@/composables/useCountdown'

const projects = useProjectsStore()
const now = useNow()
const items = computed(() => projects.upcomingDeadlines.slice(0,4))
</script>

<template>
  <Card>
    <div class="flex items-center justify-between mb-4">
      <div><h3 class="font-semibold">Project deadlines</h3></div>
      <RouterLink to="/projects" class="text-xs link">All →</RouterLink>
    </div>

    <EmptyState v-if="items.length === 0" icon="projects" title="No projects yet" body="Start one with your teammates.">
      <RouterLink to="/projects?new=1" class="link text-sm">Create project →</RouterLink>
    </EmptyState>

    <ul v-else class="divide-y divide-surface-border dark:divide-night-700">
      <li v-for="p in items" :key="p.id">
        <RouterLink :to="`/projects/${p.id}`" class="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-night-50 dark:hover:bg-night-700/50 transition-colors">
          <span class="h-9 w-9 rounded-lg grid place-items-center text-sm text-white font-semibold shrink-0" :style="{ background: p.color ?? '#3a68ff' }">
            {{ p.name.slice(0,1).toUpperCase() }}
          </span>
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">{{ p.name }}</div>
            <div class="text-xs text-night-500 truncate">
              Due {{ fmtDate(p.deadline!) }} · {{ humanCountdown(new Date(p.deadline!), now) }} left
            </div>
            <div class="h-1.5 mt-2 bg-night-100 dark:bg-night-700 rounded-full overflow-hidden">
              <div class="h-full bg-brand-500" :style="{ width: p.progress + '%' }" />
            </div>
          </div>
        </RouterLink>
      </li>
    </ul>
  </Card>
</template>
