<script setup lang="ts">
// A small "logo" for a subject: a topical glyph picked from the subject name,
// tinted with the subject's own color. Falls back to a letter monogram so any
// subject still gets a clean, distinct mark (not just the ones we recognise).
import { computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'

const props = withDefaults(defineProps<{
  name: string
  color?: string
  code?: string | null
  size?: number
}>(), { size: 20, color: '#5B7BD4' })

// Order matters — more specific / identity-defining keywords win first.
const RULES: [RegExp, string][] = [
  [/python|django|flask/, 'terminal'],
  [/data\s*base|postgre|\bsql\b|mongo|supabase|firebase/, 'database'],
  [/network|cisco|routing|tcp\/?ip/, 'network'],
  [/front.?end|\bweb\b|html|css|react|vue|svelte|\bui\b|\bux\b/, 'web'],
  [/algorithm|data\s*structure|programming|coding|software|\bjava\b|c\+\+|comput/, 'code'],
]

const icon = computed(() => {
  const hay = `${props.name} ${props.code ?? ''}`.toLowerCase()
  for (const [re, ic] of RULES) if (re.test(hay)) return ic
  return null
})
const letter = computed(() => (props.name.trim()[0] ?? '?').toUpperCase())
</script>

<template>
  <span class="grid place-items-center rounded-md shrink-0 font-semibold"
        :style="{ width: size + 'px', height: size + 'px', background: color + '22', color }">
    <Icon v-if="icon" :name="icon" :size="Math.round(size * 0.62)" />
    <span v-else :style="{ fontSize: Math.round(size * 0.52) + 'px', lineHeight: 1 }">{{ letter }}</span>
  </span>
</template>
