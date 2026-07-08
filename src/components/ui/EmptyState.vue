<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { ICONS } from '@/components/layout/NavIcons'
import { useI18n } from '@/composables/useI18n'

interface Props { icon?: string; title: string; body?: string }
const props = defineProps<Props>()
const isSvg = props.icon != null && props.icon in ICONS
const { t } = useI18n()
</script>
<template>
  <div class="text-center py-12 px-4">
    <div class="mx-auto mb-4 w-14 h-14 rounded-2xl grid place-items-center
                bg-brand-500/10 dark:bg-brand-400/15 text-brand-600 dark:text-brand-300
                ring-1 ring-brand-500/15 dark:ring-brand-400/20">
      <Icon v-if="isSvg" :name="icon!" :size="26" />
      <Icon v-else-if="!icon" name="info" :size="26" />
      <span v-else class="text-2xl">{{ icon }}</span>
    </div>
    <h4 class="text-[15px] font-semibold text-night-900 dark:text-white">{{ t(title) }}</h4>
    <p v-if="body" class="mt-1.5 text-sm text-night-500 dark:text-night-200 max-w-sm mx-auto leading-relaxed">{{ t(body) }}</p>
    <div class="mt-4 flex justify-center empty:hidden">
      <slot />
    </div>
  </div>
</template>
