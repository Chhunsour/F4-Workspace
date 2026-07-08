<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
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
import { useI18n } from '@/composables/useI18n'

const route = useRoute()
const study = useStudyStore()
const subjects = useSubjectsStore()
const { t } = useI18n()

const { error, load } = useLoad(() => Promise.all([study.fetch(), subjects.fetch()]))

const completed = computed(() => study.items.filter(x => x.ended_at))
const goalPct = computed(() => Math.min(100, Math.round((study.totalThisWeek / 60) / study.weeklyGoalMinutes * 100)))

// This week's time per subject — same week window as study.totalThisWeek.
const bySubject = computed(() => {
  const start = new Date(); start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0)
  const sums: Record<string, number> = {}
  for (const s of completed.value) {
    if (new Date(s.started_at) < start) continue
    sums[s.subject_id ?? ''] = (sums[s.subject_id ?? ''] ?? 0) + s.duration_seconds
  }
  const rows = Object.entries(sums)
    .map(([id, secs]) => ({ subject: subjects.byId(id || null), secs }))
    .sort((a, b) => b.secs - a.secs)
    .slice(0, 5)
  const max = rows[0]?.secs ?? 1
  return rows.map(r => ({ ...r, pct: Math.round(r.secs / max * 100) }))
})
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <PageHeader :title="t('Study')" :subtitle="t('Track focus time and build a streak.')" />

    <div class="grid gap-5 lg:grid-cols-3">
      <div class="lg:col-span-2"><StudyTimer hero :initial-subject="(route.query.subject as string) || null" /></div>
      <Card>
        <div class="flex items-center justify-between mb-3">
          <h3 class="t-card">{{ t('This week') }}</h3>
          <span class="chip"><Icon name="fire" :size="12" /> {{ t('{count} day streak', { count: study.streakDays }) }}</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="tile p-3">
            <div class="t-section">{{ t('Today') }}</div>
            <div class="text-lg font-semibold tabular-nums">{{ secondsToClock(study.totalToday) }}</div>
          </div>
          <div class="tile p-3">
            <div class="t-section">{{ t('Week') }}</div>
            <div class="text-lg font-semibold tabular-nums">{{ secondsToClock(study.totalThisWeek) }}</div>
          </div>
        </div>
        <div class="mt-4 mb-1.5 text-xs text-night-500 dark:text-night-300 flex justify-between">
          <span>{{ t('Goal') }} · {{ study.weeklyGoalMinutes }} {{ t('min') }}</span><span>{{ goalPct }}%</span>
        </div>
        <ProgressBar :value="goalPct" />

        <div v-if="bySubject.length" class="mt-4 border-t border-surface-border dark:border-night-700 pt-3">
          <p class="t-section mb-2">{{ t('By subject') }}</p>
          <ul class="space-y-2">
            <li v-for="row in bySubject" :key="row.subject?.id ?? 'general'">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="truncate font-medium">{{ row.subject?.name ?? t('General study') }}</span>
                <span class="tabular-nums text-night-500 dark:text-night-300 shrink-0 ml-2">{{ secondsToClock(row.secs) }}</span>
              </div>
              <ProgressBar :value="row.pct" height="h-1.5" :color="row.subject?.color ?? '#3a68ff'" />
            </li>
          </ul>
        </div>
      </Card>
    </div>

    <Card>
      <h3 class="t-card mb-3">{{ t('Recent sessions') }}</h3>
      <LoadError v-if="error" :message="error" @retry="load" />
      <EmptyState v-else-if="completed.length === 0" icon="study" :title="t('No sessions yet')"
                  :body="t('Start a timer above — even 20 minutes counts.')" />
      <ul v-else class="space-y-2">
        <li v-for="s in completed.slice(0,12)" :key="s.id" class="flex items-center gap-3 rounded-lg border border-surface-border dark:border-night-700 p-3">
          <span class="h-2.5 w-2.5 rounded-full shrink-0" :style="{ background: subjects.byId(s.subject_id)?.color ?? '#3a68ff' }" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">
              {{ subjects.byId(s.subject_id)?.name ?? t('General study') }}
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
