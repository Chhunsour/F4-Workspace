<script setup lang="ts">
import { computed } from 'vue'
import { useScheduleStore } from '@/stores/schedule'
import { useSubjectsStore } from '@/stores/subjects'
import Card from '@/components/ui/Card.vue'

const schedule = useScheduleStore()
const subjects = useSubjectsStore()

const REACTIONS = [
  'is coming for us today 😭',
  'again? we just had it yesterday 😩',
  'let\'s pretend we understood last week\'s topic ✨',
  'this is fine 🙂 this is fine 🙂',
  'okay serious mode on 💪',
  'we ball 🏀',
  'read the slides. read the slides. read the slides.',
  'it is what it is 🥲',
]

const pick = computed(() => {
  const today = schedule.todaysClasses
  const sub = today.length ? subjects.byId(today[0].subject_id) : subjects.items[0]
  if (!sub) return null
  const seed = new Date().getDate() + (sub.id?.length ?? 0)
  return { sub, line: REACTIONS[seed % REACTIONS.length] }
})
</script>

<template>
  <Card v-if="pick" class="!p-0 overflow-hidden">
    <!-- Solid tinted panel (flat translucent color, no gradient) + accent edge -->
    <div class="flex items-center gap-3 p-4 border-l-4"
         :style="{ background: pick.sub.color + '14', borderColor: pick.sub.color }">
      <div class="h-10 w-10 rounded-lg grid place-items-center text-white font-semibold text-sm shrink-0"
           :style="{ background: pick.sub.color }">
        {{ pick.sub.code?.slice(0,2) ?? '📚' }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-night-400 dark:text-night-300">Suffering from today</p>
        <div class="font-semibold truncate text-night-900 dark:text-white">{{ pick.sub.name }}</div>
        <div class="text-xs text-night-500 dark:text-night-300 truncate">{{ pick.line }}</div>
      </div>
    </div>
  </Card>
</template>
