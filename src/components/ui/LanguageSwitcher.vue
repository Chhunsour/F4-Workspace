<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { Language } from '@/stores/language'

const { t, language, languages, setLanguage } = useI18n()

defineProps<{ compact?: boolean }>()

function update(value: string) {
  setLanguage(value as Language)
}
</script>

<template>
  <label class="inline-flex items-center gap-2" :class="compact ? 'text-xs' : 'text-sm'">
    <span v-if="!compact" class="font-medium text-night-700 dark:text-night-100">{{ t('Language') }}</span>
    <select
      :value="language"
      class="input-base !min-h-0 rounded-lg py-1.5 pl-2.5 pr-8 text-sm"
      :aria-label="t('Language')"
      @change="update(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="option in languages" :key="option.value" :value="option.value">
        {{ option.nativeLabel }}
      </option>
    </select>
  </label>
</template>
