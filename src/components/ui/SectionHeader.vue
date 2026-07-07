<script setup lang="ts">
// Small section label + optional count, with an action slot on the right.
interface Props { title: string; count?: number | string }
defineProps<Props>()
</script>

<template>
  <div class="flex items-center justify-between gap-3 mb-3">
    <div class="flex items-center gap-2 min-w-0">
      <h3 class="t-section truncate">{{ title }}</h3>
      <span v-if="count !== undefined" class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-md text-[11px] font-semibold bg-night-100 dark:bg-night-700 text-night-500 dark:text-night-200">{{ count }}</span>
    </div>
    <div v-if="$slots.action" class="shrink-0">
      <slot name="action" />
    </div>
  </div>
</template>
