<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

interface Props {
  modelValue?: string | number | null
  label?: string
  hint?: string
  options: { value: string | number | null; label: string }[]
  placeholder?: string
  disabled?: boolean
}
const props = defineProps<Props>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
const { t } = useI18n()
</script>

<template>
  <label class="block">
    <span v-if="props.label" class="block t-label mb-1.5">
      {{ t(props.label) }}
    </span>
    <div class="relative">
      <select
        :value="props.modelValue ?? ''"
        :disabled="props.disabled"
        class="input-base pr-9 appearance-none"
        @change="(e: Event) => $emit('update:modelValue', (e.target as HTMLSelectElement).value)"
      >
        <option v-if="props.placeholder" value="">{{ t(props.placeholder) }}</option>
        <option v-for="o in props.options" :key="String(o.value)" :value="o.value ?? ''">{{ t(o.label) }}</option>
      </select>
      <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-night-400" width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M5.5 7.5l4.5 4.5 4.5-4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <p v-if="props.hint" class="mt-1 text-xs text-night-500">{{ t(props.hint) }}</p>
  </label>
</template>
