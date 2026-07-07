<script setup lang="ts">
// Compact metric: label on top, big tabular value, optional hint/trend.
interface Props { label: string; value: string | number; hint?: string; accent?: boolean }
defineProps<Props>()
</script>

<template>
  <div class="rounded-lg border border-surface-border dark:border-night-700 p-3.5">
    <div class="t-meta">{{ label }}</div>
    <div class="mt-0.5 text-xl font-semibold tabular-nums leading-tight"
         :class="accent ? 'text-brand-600 dark:text-brand-300' : 'text-night-900 dark:text-white'">
      {{ value }}
    </div>
    <div v-if="hint" class="mt-0.5 text-[11px] text-night-500 dark:text-night-400">{{ hint }}</div>
  </div>
</template>
