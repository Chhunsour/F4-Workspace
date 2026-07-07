<script setup lang="ts">
import { computed } from 'vue'
import { useNow } from '@/composables/useCountdown'
import { fmtDate, humanCountdown } from '@/lib/utils'
import Card from '@/components/ui/Card.vue'

// Term dates from the timetable.
const TERM_START = new Date('2026-03-16T00:00:00')
const TERM_END   = new Date('2026-06-26T23:59:59')
const MAKEUP_END = new Date('2026-07-17T23:59:59')

const now = useNow()
const totalMs = TERM_END.getTime() - TERM_START.getTime()

const pct = computed(() => {
  const elapsed = now.value.getTime() - TERM_START.getTime()
  return Math.max(0, Math.min(100, Math.round(elapsed / totalMs * 100)))
})
const state = computed(() => {
  if (now.value < TERM_START) return { label: `Starts ${fmtDate(TERM_START)}`, sub: `in ${humanCountdown(TERM_START, now.value)}` }
  if (now.value > MAKEUP_END) return { label: 'Semester wrapped', sub: 'Enjoy the break' }
  if (now.value > TERM_END)   return { label: 'Make-up period', sub: `ends ${fmtDate(MAKEUP_END)}` }
  return { label: 'Semester in progress', sub: `ends in ${humanCountdown(TERM_END, now.value)}` }
})
</script>

<template>
  <Card>
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="font-semibold">Semester progress</h3>
        <p class="text-xs text-night-500">{{ state.label }} · {{ state.sub }}</p>
      </div>
      <div class="text-2xl font-bold tabular-nums">{{ pct }}%</div>
    </div>
    <div class="h-2 bg-night-100 dark:bg-night-700 rounded-full overflow-hidden">
      <div class="h-full rounded-full bg-brand-500" :style="{ width: pct + '%' }" />
    </div>
    <p class="mt-2 text-[11px] text-night-500">
      {{ fmtDate(TERM_START, { month:'short', day:'numeric' }) }} — {{ fmtDate(TERM_END, { month:'short', day:'numeric', year:'numeric' }) }}
    </p>
  </Card>
</template>
