<script setup lang="ts">
// Single source of truth for the Team F4 app mark.
interface Props { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }
const props = withDefaults(defineProps<Props>(), { size: 'md' })
const dim = {
  xs: 'h-7 w-7 rounded-lg',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-11 w-11 rounded-xl',
  xl: 'h-16 w-16 rounded-2xl',
}[props.size]
</script>

<template>
  <img
    src="/team-f4-logo.png"
    alt="Team F4"
    :class="['shrink-0 select-none object-cover shadow-[0_8px_22px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/5 dark:ring-white/10', dim]"
    draggable="false"
  />
</template>
