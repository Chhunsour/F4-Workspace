<script setup lang="ts">
// Clean date/time field: leading icon, no clunky native picker button, and the
// whole field opens the picker on click. Drop-in replacement for <Input type="date|time">.
import { computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { classNames } from '@/lib/utils'
import { useI18n } from '@/composables/useI18n'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  type?: 'date' | 'time'
  label?: string
  required?: boolean
  error?: string
  min?: string
  max?: string
}>(), { type: 'date' })
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
const { t } = useI18n()

const icon = computed(() => (props.type === 'time' ? 'clock' : 'calendar'))

function openPicker(e: MouseEvent) {
  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
  el.showPicker?.()
}
</script>

<template>
  <label class="block">
    <span v-if="label" class="block t-label mb-1.5">
      {{ t(label) }} <span v-if="required" class="text-red-500">*</span>
    </span>
    <div class="relative">
      <Icon :name="icon" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-night-400" />
      <input
        :type="type"
        :value="modelValue ?? ''"
        :required="required"
        :min="min"
        :max="max"
        :aria-label="label ? t(label) : undefined"
        :class="classNames('input-base picker-clean !pl-9 cursor-pointer', error && 'border-red-400 focus:border-red-500')"
        @click="openPicker"
        @input="(e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value)"
      />
    </div>
    <p v-if="error" class="mt-1 text-xs text-red-500">{{ error }}</p>
  </label>
</template>
