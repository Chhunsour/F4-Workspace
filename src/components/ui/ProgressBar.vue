<script setup lang="ts">
// Solid-fill progress bar (no gradient). Color defaults to brand.
interface Props { value: number; color?: string; height?: string }
const props = withDefaults(defineProps<Props>(), { height: 'h-2' })
</script>

<template>
  <div :class="['w-full bg-night-100 dark:bg-night-700 rounded-full overflow-hidden', height]"
       role="progressbar" :aria-valuenow="Math.round(value)" aria-valuemin="0" aria-valuemax="100">
    <div class="h-full rounded-full transition-[width] duration-500 ease-smooth"
         :class="!color ? 'bg-brand-500' : ''"
         :style="{ width: Math.max(0, Math.min(100, value)) + '%', ...(color ? { background: color } : {}) }" />
  </div>
</template>
