<script setup lang="ts">
import { computed } from 'vue'
import { useLoad } from '@/composables/useLoad'
import { useStudyStore } from '@/stores/study'
import { useSubjectsStore } from '@/stores/subjects'
import Card from '@/components/ui/Card.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import StudyTimer from '@/components/study/StudyTimer.vue'
import Icon from '@/components/ui/Icon.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { fmtDate, secondsToClock } from '@/lib/utils'

const study = useStudyStore()
const subjects = useSubjectsStore()

const { error, load } = useLoad(() => Promise.all([study.fetch(), subjects.fetch()]))

const completed = computed(() => study.items.filter(x => x.ended_at))
const goalPct = computed(() => Math.min(100, Math.round((study.totalThisWeek / 60) / study.weeklyGoalMinutes * 100)))
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <PageHeader title="Study" subtitle="Track focus time and build a streak." />

    <div class="grid gap-5 lg:grid-cols-3">
      <div class="lg:col-span-2"><StudyTimer hero /></div>
      <div class="space-y-5">
        <Card>
          <div class="flex items-center justify-between mb-2">
            <h3 class="t-card">This week</h3>
            <span class="chip"><Icon name="fire" :size="12" /> {{ study.streakDays }} day streak</span>
          </div>
          <div class="text-2xl font-semibold tabular-nums">{{ secondsToClock(study.totalThisWeek) }}</div>
          <div class="mt-3 mb-1.5 text-xs text-night-500 dark:text-night-300 flex justify-between">
            <span>Goal · {{ study.weeklyGoalMinutes }} min</span><span>{{ goalPct }}%</span>
          </div>
          <ProgressBar :value="goalPct" />
        </Card>
        <Card>
          <h3 class="t-card mb-1.5">Today</h3>
          <div class="text-2xl font-semibold tabular-nums">{{ secondsToClock(study.totalToday) }}</div>
          <p class="mt-1 text-xs text-night-500 dark:text-night-300">Keep it going. Little wins compound.</p>
        </Card>
      </div>
    </div>

    <Card>
      <h3 class="t-card mb-3">Recent sessions</h3>
      <LoadError v-if="error" :message="error" @retry="load" />
      <EmptyState v-else-if="completed.length === 0" icon="study" title="No sessions yet"
                  body="Start a timer above — even 20 minutes counts." />
      <ul v-else class="space-y-2">
        <li v-for="s in completed.slice(0,12)" :key="s.id" class="flex items-center gap-3 rounded-lg border border-surface-border dark:border-night-700 p-3">
          <span class="h-2.5 w-2.5 rounded-full shrink-0" :style="{ background: subjects.byId(s.subject_id)?.color ?? '#3a68ff' }" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">
              {{ subjects.byId(s.subject_id)?.name ?? 'General study' }}
              <span v-if="s.topic" class="text-night-500 dark:text-night-300 font-normal"> · {{ s.topic }}</span>
            </div>
            <div class="text-xs text-night-500 dark:text-night-300">{{ fmtDate(s.started_at, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) }}</div>
          </div>
          <span class="chip tabular-nums">{{ secondsToClock(s.duration_seconds) }}</span>
        </li>
      </ul>
    </Card>
  </div>
</template>
