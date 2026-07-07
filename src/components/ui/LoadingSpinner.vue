<script setup lang="ts">
interface Props { label?: string; size?: number }
withDefaults(defineProps<Props>(), { size: 20 })
</script>
<template>
  <div class="flex items-center gap-2 text-night-500">
    <span :style="{ width: size + 'px', height: size + 'px' }" class="inline-block rounded-full border-2 border-current border-t-transparent animate-spin" />
    <span v-if="label" class="text-sm">{{ label }}</span>
  </div>
</template>
