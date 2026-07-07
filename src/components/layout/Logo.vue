<script setup lang="ts">
// Single source of truth for the app mark. Solid color, no gradient.
interface Props { size?: 'sm' | 'md' | 'lg' }
const props = withDefaults(defineProps<Props>(), { size: 'md' })
const dim = { sm: 'h-8 w-8 text-base rounded-lg', md: 'h-9 w-9 text-lg rounded-lg', lg: 'h-11 w-11 text-xl rounded-xl' }[props.size]
</script>

<template>
  <div :class="['bg-brand-600 text-white font-bold grid place-items-center shrink-0 select-none', dim]">U</div>
</template>
