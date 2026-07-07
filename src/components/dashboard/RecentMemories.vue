<script setup lang="ts">
import { computed } from 'vue'
import { useMemoriesStore } from '@/stores/memories'
import { RouterLink } from 'vue-router'
import Card from '@/components/ui/Card.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import { fmtDate } from '@/lib/utils'

const mem = useMemoriesStore()
const items = computed(() => mem.recent.slice(0,4))
</script>

<template>
  <Card>
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold">Recent memories</h3>
      <RouterLink to="/memories" class="text-xs link">Gallery →</RouterLink>
    </div>

    <EmptyState v-if="items.length === 0" icon="camera" title="No memories yet" body="Add photos of class moments, project nights, or exam week." />

    <div v-else class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <RouterLink v-for="m in items" :key="m.id" :to="`/memories/${m.id}`"
                  class="group relative rounded-xl overflow-hidden aspect-square bg-night-100 dark:bg-night-800 border border-surface-border dark:border-night-700">
        <img v-if="mem.thumbnailUrl(m.id)" :src="mem.thumbnailUrl(m.id)!" loading="lazy" decoding="async"
             class="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-smooth"
             alt="" />
        <div v-else class="absolute inset-0 grid place-items-center text-night-300 dark:text-night-500">
          <Icon name="camera" :size="24" />
        </div>
        <div class="img-caption text-xs">
          <div class="font-medium truncate">{{ m.title || 'Untitled' }}</div>
          <div class="opacity-80 truncate">{{ fmtDate(m.event_date, { month:'short', day:'numeric' }) || '' }}</div>
        </div>
      </RouterLink>
    </div>
  </Card>
</template>
