<script setup lang="ts">
// Consistent page title block used at the top of every view.
interface Props { title: string; subtitle?: string }
defineProps<Props>()
</script>

<template>
  <div class="flex items-end justify-between gap-3 flex-wrap">
    <div class="min-w-0">
      <h1 class="t-page">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-night-500 dark:text-night-300">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
