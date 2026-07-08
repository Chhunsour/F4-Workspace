<script setup lang="ts">
import { classNames } from '@/lib/utils'
import { useI18n } from '@/composables/useI18n'

interface Props {
  modelValue?: string | null
  placeholder?: string
  label?: string
  hint?: string
  rows?: number
  disabled?: boolean
}
const props = withDefaults(defineProps<Props>(), { rows: 3 })
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
const { t } = useI18n()
</script>

<template>
  <label class="block">
    <span v-if="props.label" class="block t-label mb-1.5">
      {{ t(props.label) }}
    </span>
    <textarea
      :value="props.modelValue ?? ''"
      :placeholder="props.placeholder ? t(props.placeholder) : undefined"
      :rows="props.rows"
      :disabled="props.disabled"
      :class="classNames('input-base resize-y')"
      @input="(e: Event) => $emit('update:modelValue', (e.target as HTMLTextAreaElement).value)"
    />
    <p v-if="props.hint" class="mt-1 text-xs text-night-500">{{ t(props.hint) }}</p>
  </label>
</template>
