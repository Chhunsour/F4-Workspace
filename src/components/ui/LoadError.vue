<script setup lang="ts">
import Button from '@/components/ui/Button.vue'

interface Props { message?: string }
defineProps<Props>()
defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <div class="text-center py-10 px-4">
    <div class="mx-auto mb-3.5 w-11 h-11 rounded-xl bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-300 flex items-center justify-center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 8v5m0 3v.01M10.3 4.6 2.9 18a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
              stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <h4 class="t-card">Couldn't load this</h4>
    <p class="mt-1 text-sm text-night-500 dark:text-night-300 max-w-sm mx-auto">
      {{ message || 'Check your connection and try again.' }}
    </p>
    <div class="mt-4 flex justify-center">
      <Button variant="secondary" size="sm" @click="$emit('retry')">Try again</Button>
    </div>
  </div>
</template>
