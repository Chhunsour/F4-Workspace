<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
const props = defineProps<{ bare?: boolean }>()
const theme = useThemeStore()
const cls = computed(() =>
  props.bare
    ? 'flex items-center justify-center text-current transition-colors'
    : 'h-9 w-9 rounded-xl border border-[var(--glass-border)] bg-white/50 dark:bg-white/[0.06] backdrop-blur-md '
      + 'text-night-700 dark:text-night-100 hover:bg-white/70 dark:hover:bg-white/[0.1] transition-colors flex items-center justify-center'
)
</script>
<template>
  <button :class="cls" aria-label="Toggle theme" @click="theme.toggle()">
    <svg v-if="theme.resolved === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill="currentColor"/>
      <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2.1 2.1M17.4 17.4l2.1 2.1M4.5 19.5l2.1-2.1M17.4 6.6l2.1-2.1"/>
      </g>
    </svg>
    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M21 13.5A9 9 0 1 1 10.5 3a7.5 7.5 0 0 0 10.5 10.5z" fill="currentColor"/>
    </svg>
  </button>
</template>
