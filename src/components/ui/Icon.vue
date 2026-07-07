<script setup lang="ts">
import { ICONS } from '@/components/layout/NavIcons'
interface Props { name: string; size?: number }
const props = withDefaults(defineProps<Props>(), { size: 20 })
</script>

<template>
  <svg :width="props.size" :height="props.size" viewBox="0 0 24 24" fill="none" v-html="ICONS[props.name] ?? ''" />
</template>
