<script setup lang="ts">
import { computed } from 'vue'
import { useStudyStore } from '@/stores/study'
import { useSubjectsStore } from '@/stores/subjects'
import { secondsToClock } from '@/lib/utils'
import Card from '@/components/ui/Card.vue'
import Icon from '@/components/ui/Icon.vue'

const study = useStudyStore()
const subjects = useSubjectsStore()

const goalPct = computed(() => Math.min(100, Math.round((study.totalThisWeek / 60) / study.weeklyGoalMinutes * 100)))
const fav = computed(() => subjects.byId(study.favoriteSubjectId))
</script>

<template>
  <Card>
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold">Study streak</h3>
      <span class="chip"><Icon name="fire" :size="12" /> {{ study.streakDays }} day{{ study.streakDays===1?'':'s' }}</span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-surface-border dark:border-night-700 p-3">
        <div class="text-[11px] uppercase tracking-wide text-night-500">Today</div>
        <div class="text-lg font-semibold">{{ secondsToClock(study.totalToday) }}</div>
      </div>
      <div class="rounded-xl border border-surface-border dark:border-night-700 p-3">
        <div class="text-[11px] uppercase tracking-wide text-night-500">This week</div>
        <div class="text-lg font-semibold">{{ secondsToClock(study.totalThisWeek) }}</div>
      </div>
    </div>

    <div class="mt-4">
      <div class="flex items-center justify-between text-xs text-night-500 mb-1.5">
        <span>Weekly goal · {{ study.weeklyGoalMinutes }} min</span>
        <span>{{ goalPct }}%</span>
      </div>
      <div class="h-2 bg-night-100 dark:bg-night-700 rounded-full overflow-hidden">
        <div class="h-full rounded-full bg-brand-500 transition-all" :style="{ width: goalPct + '%' }" />
      </div>
    </div>

    <p v-if="fav" class="mt-3 text-xs text-night-500">
      Most studied this month: <span class="font-medium text-night-700 dark:text-night-100">{{ fav.name }}</span>
    </p>
  </Card>
</template>
