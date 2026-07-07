<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { ICONS } from '@/components/layout/NavIcons'

interface Props { icon?: string; title: string; body?: string }
const props = defineProps<Props>()
const isSvg = props.icon != null && props.icon in ICONS
</script>
<template>
  <div class="text-center py-10 px-4">
    <div class="mx-auto mb-3.5 w-11 h-11 rounded-xl bg-night-100 text-night-400 dark:bg-night-700 dark:text-night-300 flex items-center justify-center">
      <Icon v-if="isSvg" :name="icon!" :size="22" />
      <span v-else class="text-2xl">{{ icon ?? '✨' }}</span>
    </div>
    <h4 class="t-card">{{ title }}</h4>
    <p v-if="body" class="mt-1 text-sm text-night-500 dark:text-night-300 max-w-sm mx-auto leading-relaxed">{{ body }}</p>
    <div class="mt-4 flex justify-center empty:hidden">
      <slot />
    </div>
  </div>
</template>
