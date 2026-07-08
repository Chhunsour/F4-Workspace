<script setup lang="ts">
import { computed } from 'vue'
import { classNames } from '@/lib/utils'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  disabled?: boolean
  as?: 'button' | 'a'
  href?: string
  type?: 'button' | 'submit'
}
const props = withDefaults(defineProps<Props>(), {
  variant: 'primary', size: 'md', as: 'button', type: 'button',
})
defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const cls = computed(() => classNames(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl select-none',
  'transition-[background-color,border-color,box-shadow,transform] duration-150',
  'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
  props.size === 'sm'   && 'text-[13px] h-9 px-3.5',
  props.size === 'md'   && 'text-sm h-10 px-4',
  props.size === 'lg'   && 'text-[15px] h-12 px-6',
  props.size === 'icon' && 'h-10 w-10 p-0',
  props.variant === 'primary'   && 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white shadow-brand hover:shadow-brandLg dark:bg-brand-600 dark:hover:bg-brand-500 dark:active:bg-brand-700',
  props.variant === 'secondary' && 'bg-white dark:bg-[var(--surface-elevated)] border border-[var(--card-border-strong)] dark:border-[var(--border-strong)] text-night-800 dark:text-[var(--text-primary)] hover:bg-brand-50 dark:hover:bg-[var(--surface-hover)] hover:border-brand-300 dark:hover:border-brand-500/45',
  props.variant === 'ghost'     && 'text-night-700 dark:text-[var(--text-secondary)] hover:bg-brand-500/10 dark:hover:bg-[var(--surface-hover)] dark:hover:text-[var(--text-primary)]',
  props.variant === 'accent'    && 'bg-accent-300 hover:bg-accent-400 text-night-900 shadow-[0_10px_28px_-12px_rgba(245,154,6,0.55)]',
  props.variant === 'success'   && 'bg-grass-500 hover:bg-grass-600 active:bg-grass-700 text-white shadow-[0_10px_28px_-12px_rgba(16,185,129,0.55)]',
  props.variant === 'danger'    && 'bg-red-600 hover:bg-red-700 text-white shadow-[0_10px_28px_-12px_rgba(220,38,38,0.5)] dark:bg-red-500/85 dark:hover:bg-red-500',
))
</script>

<template>
  <component
    :is="props.as"
    :type="props.as === 'button' ? props.type : undefined"
    :href="props.as === 'a' ? props.href : undefined"
    :disabled="props.disabled || props.loading"
    :class="cls"
    @click="(e: MouseEvent) => $emit('click', e)"
  >
    <span v-if="props.loading" class="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
    <slot />
  </component>
</template>
