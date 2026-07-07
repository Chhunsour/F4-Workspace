<script setup lang="ts">
import { classNames } from '@/lib/utils'

interface Props {
  modelValue?: string | number | null
  type?: string
  placeholder?: string
  label?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  autocomplete?: string
  inputClass?: string
  min?: string | number
  max?: string | number
  step?: string | number
}
const props = withDefaults(defineProps<Props>(), { type: 'text' })
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <label class="block">
    <span v-if="props.label" class="block t-label mb-1.5">
      {{ props.label }} <span v-if="props.required" class="text-red-500">*</span>
    </span>
    <input
      :type="props.type"
      :value="props.modelValue ?? ''"
      :placeholder="props.placeholder"
      :required="props.required"
      :disabled="props.disabled"
      :autocomplete="props.autocomplete"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :class="classNames('input-base', props.error && 'border-red-400 focus:border-red-500', props.inputClass)"
      @input="(e: Event) => $emit('update:modelValue', (e.target as HTMLInputElement).value)"
    />
    <p v-if="props.error" class="mt-1 text-xs text-red-500">{{ props.error }}</p>
    <p v-else-if="props.hint" class="mt-1 text-xs text-night-500">{{ props.hint }}</p>
  </label>
</template>
