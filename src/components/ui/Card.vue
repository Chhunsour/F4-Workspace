<script setup lang="ts">
import { classNames } from '@/lib/utils'
interface Props { padded?: boolean; hover?: boolean; class?: string; }
const props = withDefaults(defineProps<Props>(), { padded: true })
</script>
<template>
  <div :class="classNames('card', props.hover && 'card-hover', props.padded && 'p-5', props.class)">
    <slot />
  </div>
</template>
