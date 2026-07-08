<script setup lang="ts">
// Solid-fill progress bar (no gradient). Color defaults to brand.
interface Props { value: number; color?: string; height?: string; glow?: boolean }
const props = withDefaults(defineProps<Props>(), { height: 'h-2', glow: false })
</script>

<template>
  <div :class="['w-full bg-night-100 dark:bg-white/[0.06] rounded-full overflow-hidden', height]"
       role="progressbar" :aria-valuenow="Math.round(value)" aria-valuemin="0" aria-valuemax="100">
    <div class="h-full rounded-full transition-[width] duration-500 ease-smooth"
         :class="[
           !color && 'bg-brand-500',
           glow && !color && 'shadow-[0_0_12px_rgba(91,123,212,0.6)]',
         ]"
         :style="{ width: Math.max(0, Math.min(100, value)) + '%', ...(color ? { background: color } : {}) }" />
  </div>
</template>
