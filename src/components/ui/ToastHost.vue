<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import Icon from '@/components/ui/Icon.vue'
import { useI18n } from '@/composables/useI18n'
const t = useToast()
const { t: tr } = useI18n()

function iconName(kind: string) {
  return { success: 'check', info: 'info', warning: 'warning', error: 'close' }[kind] || 'info'
}

function toneClasses(kind: string) {
  // Frosted glass toast with a colored accent edge per tone.
  return {
    success: 'text-emerald-800 dark:text-emerald-100 border-l-[3px] border-l-emerald-500',
    info:    'text-brand-800 dark:text-brand-100 border-l-[3px] border-l-brand-500',
    warning: 'text-accent-800 dark:text-accent-200 border-l-[3px] border-l-accent-400',
    error:   'text-red-800 dark:text-red-100 border-l-[3px] border-l-red-500',
  }[kind] || ''
}
function iconTone(kind: string) {
  return {
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    info:    'bg-brand-500/15 text-brand-600 dark:text-brand-300',
    warning: 'bg-accent-400/20 text-accent-700 dark:text-accent-300',
    error:   'bg-red-500/15 text-red-600 dark:text-red-300',
  }[kind] || ''
}
</script>

<template>
  <div class="fixed z-[100] top-4 right-4 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-96 pointer-events-none"
       aria-live="polite" role="status">
    <transition-group name="fade">
      <div v-for="i in t.items" :key="i.id"
           :class="['glass-panel !rounded-2xl bg-white/80 dark:bg-[rgba(20,24,33,0.8)] px-4 py-3 pointer-events-auto', toneClasses(i.kind)]">
        <div class="flex items-start gap-3">
          <span :class="['h-6 w-6 rounded-lg flex items-center justify-center shrink-0', iconTone(i.kind)]"><Icon :name="iconName(i.kind)" :size="15" /></span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-night-900 dark:text-white">{{ i.title }}</div>
            <div v-if="i.body" class="text-xs text-night-500 dark:text-night-300 mt-0.5">{{ i.body }}</div>
          </div>
          <button class="relative shrink-0 text-night-400 hover:text-night-700 dark:hover:text-white after:absolute after:-inset-2 after:content-['']"
                  @click="t.dismiss(i.id)" :aria-label="tr('Dismiss')"><Icon name="close" :size="14" /></button>
        </div>
      </div>
    </transition-group>
  </div>
</template>
