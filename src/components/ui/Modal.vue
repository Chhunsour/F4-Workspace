<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

interface Props { open: boolean; title?: string; wide?: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

function close() { emit('update:open', false) }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }

watch(() => props.open, (open) => {
  if (open) {
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
  } else {
    window.removeEventListener('keydown', onKey)
    document.body.style.overflow = ''
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="props.open"
           class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
           role="dialog" aria-modal="true">
        <div class="absolute inset-0 bg-night-950/50 backdrop-blur-md" @click="close" />
        <div :class="['relative w-full', props.wide ? 'max-w-3xl' : 'max-w-lg',
                       'glass-panel !rounded-3xl shadow-pop',
                       'bg-white/80 dark:bg-[rgba(20,24,33,0.8)]',
                       'animate-slideUp max-h-[90vh] overflow-y-auto']">
          <header v-if="props.title || $slots.header" class="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[var(--glass-hair)] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl rounded-t-3xl">
            <slot name="header">
              <h3 class="t-card !text-lg">{{ props.title }}</h3>
            </slot>
            <button class="text-night-500 hover:text-night-900 dark:hover:text-white transition-colors p-1 rounded-lg" @click="close" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </button>
          </header>
          <div class="p-5">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="px-5 py-4 border-t border-[var(--glass-hair)] flex items-center justify-end gap-2">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </transition>
  </teleport>
</template>
