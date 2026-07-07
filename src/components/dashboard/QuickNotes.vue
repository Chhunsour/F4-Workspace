<script setup lang="ts">
import { computed } from 'vue'
import { useNotesStore } from '@/stores/notes'
import Card from '@/components/ui/Card.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { RouterLink } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'

const notes = useNotesStore()
const items = computed(() => notes.recent.slice(0,3))
</script>

<template>
  <Card>
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold">Quick notes</h3>
      <RouterLink to="/notes" class="text-xs link">All notes →</RouterLink>
    </div>

    <EmptyState v-if="items.length === 0" icon="notes" title="No notes yet" body="Quick thoughts, reminders, tiny todos.">
      <RouterLink to="/notes?new=1" class="link text-sm">New note →</RouterLink>
    </EmptyState>

    <ul v-else class="divide-y divide-surface-border dark:divide-night-700">
      <li v-for="n in items" :key="n.id">
        <RouterLink :to="`/notes?id=${n.id}`"
                    class="-mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2.5 hover:bg-night-50 dark:hover:bg-night-700/50 transition-colors">
          <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :style="{ background: n.color ?? '#3a68ff' }" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="font-medium text-sm truncate">{{ n.title || 'Untitled note' }}</span>
              <Icon v-if="n.is_pinned" name="pin" :size="12" class="shrink-0 text-night-400" />
            </div>
            <div class="text-xs text-night-500 truncate">{{ n.body }}</div>
          </div>
        </RouterLink>
      </li>
    </ul>
  </Card>
</template>
