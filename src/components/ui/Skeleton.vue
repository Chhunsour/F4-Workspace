<script setup lang="ts">
// Gradient-free shimmer placeholder. Use `lines` for text blocks or slot custom shapes.
interface Props { lines?: number; height?: string; rounded?: string; width?: string }
const props = withDefaults(defineProps<Props>(), { rounded: 'rounded-md' })
</script>

<template>
  <div v-if="lines" class="space-y-2">
    <div v-for="i in lines" :key="i"
         class="skeleton h-3.5"
         :class="i === lines ? 'w-2/3' : 'w-full'" />
  </div>
  <div v-else class="skeleton" :class="[height ?? 'h-4', rounded, width ?? 'w-full']" />
</template>
