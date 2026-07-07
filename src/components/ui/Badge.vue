<script setup lang="ts">
import { classNames } from '@/lib/utils'
interface Props { tone?: string; dot?: string }
const props = defineProps<Props>()
</script>
<template>
  <span :class="classNames('chip', props.tone)">
    <span v-if="props.dot" class="inline-block h-1.5 w-1.5 rounded-full" :style="{ background: props.dot }" />
    <slot />
  </span>
</template>
