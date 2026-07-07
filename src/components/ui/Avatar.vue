<script setup lang="ts">
import { computed } from 'vue'
import { initials } from '@/lib/utils'

interface Props { src?: string | null; name?: string | null; size?: 'sm'|'md'|'lg'|'xl' }
const props = withDefaults(defineProps<Props>(), { size: 'md' })

const dim = computed(() => ({
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-24 w-24 text-2xl',
}[props.size]))

const bg = computed(() => {
  const n = props.name || 'x'
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) & 0xffffff
  const hue = h % 360
  return `hsl(${hue} 70% 55%)`
})
</script>

<template>
  <span :class="['inline-flex items-center justify-center rounded-full font-semibold text-white overflow-hidden shrink-0', dim]"
        :style="!props.src ? { background: bg } : undefined">
    <img v-if="props.src" :src="props.src" :alt="props.name ?? ''" class="h-full w-full object-cover" />
    <template v-else>{{ initials(props.name ?? '') }}</template>
  </span>
</template>
