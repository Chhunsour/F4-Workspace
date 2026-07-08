<script setup lang="ts">
import { ref } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { classNames } from '@/lib/utils'

interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
  autocomplete?: string
}
const props = defineProps<Props>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const visible = ref(false)
</script>

<template>
  <label class="block">
    <span v-if="props.label" class="block t-label mb-1.5">
      {{ props.label }} <span v-if="props.required" class="text-red-500">*</span>
    </span>
    <div class="relative">
      <input
        :type="visible ? 'text' : 'password'"
        :value="props.modelValue ?? ''"
        :placeholder="props.placeholder"
        :required="props.required"
        :autocomplete="props.autocomplete"
        :class="classNames('input-base pr-11', props.error && 'border-red-400 focus:border-red-500')"
        @input="(e: Event) => $emit('update:modelValue', (e.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-night-400 transition-colors hover:text-night-700 dark:hover:text-night-100"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        :aria-pressed="visible"
        @click="visible = !visible"
      >
        <Icon :name="visible ? 'eye_off' : 'eye'" :size="18" />
      </button>
    </div>
    <p v-if="props.error" class="mt-1 text-xs text-red-500">{{ props.error }}</p>
    <p v-else-if="props.hint" class="mt-1 text-xs text-night-500 dark:text-night-300">{{ props.hint }}</p>
  </label>
</template>
