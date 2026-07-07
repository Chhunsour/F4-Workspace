<script setup lang="ts">
import { computed } from 'vue'
import { classNames } from '@/lib/utils'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
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
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg select-none',
  'transition-[background-color,border-color,box-shadow,transform] duration-150',
  'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
  props.size === 'sm'   && 'text-[13px] h-9 px-3',
  props.size === 'md'   && 'text-sm h-10 px-4',
  props.size === 'lg'   && 'text-[15px] h-11 px-5',
  props.size === 'icon' && 'h-10 w-10 p-0',
  props.variant === 'primary'   && 'bg-brand-600 hover:bg-brand-700 text-white shadow-[0_6px_18px_-6px_rgba(37,73,240,0.6)]',
  props.variant === 'secondary' && 'backdrop-blur-md bg-white/55 dark:bg-white/[0.06] border border-[var(--glass-border)] text-night-800 dark:text-night-50 hover:bg-white/75 dark:hover:bg-white/[0.1] shadow-glassSm',
  props.variant === 'ghost'     && 'text-night-600 dark:text-night-200 hover:bg-white/50 dark:hover:bg-white/[0.06]',
  props.variant === 'accent'    && 'bg-accent-300 hover:bg-accent-400 text-night-900 shadow-[0_6px_18px_-6px_rgba(245,154,6,0.55)]',
  props.variant === 'danger'    && 'bg-red-600 hover:bg-red-700 text-white shadow-[0_6px_18px_-6px_rgba(220,38,38,0.5)]',
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
