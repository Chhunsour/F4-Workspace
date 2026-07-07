<script setup lang="ts">
import { useRouter } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'

const router = useRouter()
const actions = [
  { label: 'New assignment', to: '/assignments?new=1', icon: 'assignments' },
  { label: 'New project',    to: '/projects?new=1',    icon: 'projects' },
  { label: 'New memory',     to: '/memories?new=1',    icon: 'memories' },
  { label: 'Study session',  to: '/study?new=1',       icon: 'study' },
  { label: 'New note',       to: '/notes?new=1',       icon: 'notes' },
]
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="a in actions" :key="a.label"
      class="inline-flex h-9 items-center gap-2 rounded-xl border border-surface-border bg-white px-3 text-sm font-medium text-night-700 transition-colors hover:bg-night-50 dark:border-night-700 dark:bg-night-800 dark:text-night-100 dark:hover:bg-night-700"
      @click="router.push(a.to)"
    >
      <Icon :name="a.icon" :size="15" class="text-night-400 dark:text-night-300" />
      {{ a.label }}
    </button>
  </div>
</template>
