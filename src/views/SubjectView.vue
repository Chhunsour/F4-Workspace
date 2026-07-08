<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useSubjectsStore } from '@/stores/subjects'
import { useScheduleStore, classDateForToday } from '@/stores/schedule'
import { useAssignmentsStore } from '@/stores/assignments'
import { useNotesStore } from '@/stores/notes'
import { useStudyStore } from '@/stores/study'
import { useProjectsStore } from '@/stores/projects'
import { useNow } from '@/composables/useCountdown'
import { dueLabel, fmtTime, fmtDate, humanCountdown, secondsToClock, WEEKDAY_LONG } from '@/lib/utils'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import LoadError from '@/components/ui/LoadError.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { Assignment } from '@/types'

const route = useRoute()
const subjects = useSubjectsStore()
const schedule = useScheduleStore()
const assignments = useAssignmentsStore()
const notes = useNotesStore()
const study = useStudyStore()
const projects = useProjectsStore()
const now = useNow()

const subjectId = computed(() => String(route.params.id))
const subject = computed(() => subjects.byId(subjectId.value))

const { error, loading, load } = useLoad(() =>
  Promise.all([subjects.fetch(), schedule.fetch(), assignments.fetch(), notes.fetch(), study.fetch(), projects.fetch()]))

// Classes for this subject, ordered Mon→Sun from today
const classes = computed(() =>
  schedule.items.filter(c => c.subject_id === subjectId.value)
    .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)))

// Next upcoming class for this subject
const nextClass = computed(() => {
  let best: { c: typeof classes.value[0]; start: Date } | null = null
  for (const c of classes.value) {
    const { start, end } = classDateForToday(c, now.value)
    const when = end > now.value ? start : new Date(start.getTime() + 7 * 86400_000)
    if (!best || when < best.start) best = { c, start: when }
  }
  return best
})

function dueDate(a: Assignment): Date | null {
  return a.due_date ? new Date(`${a.due_date}T${a.due_time ?? '23:59'}:00`) : null
}
const openAssignments = computed(() =>
  assignments.items.filter(a => a.subject_id === subjectId.value && a.status !== 'completed')
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')))

const subjectNotes = computed(() =>
  notes.items.filter(n => n.subject_id === subjectId.value).slice(0, 5))

const subjectProjects = computed(() =>
  projects.items.filter(p => p.subject_id === subjectId.value && p.status !== 'archived'))

const sessions = computed(() =>
  study.items.filter(s => s.subject_id === subjectId.value && s.ended_at).slice(0, 5))
const totalStudied = computed(() =>
  study.items.filter(s => s.subject_id === subjectId.value).reduce((sum, s) => sum + s.duration_seconds, 0))
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <RouterLink to="/schedule" class="link inline-flex items-center gap-1 text-xs !no-underline hover:!underline">
      <Icon name="chevron_left" :size="14" /> Schedule
    </RouterLink>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="space-y-3">
      <Skeleton height="h-20" rounded="rounded-xl" />
      <Skeleton height="h-64" rounded="rounded-xl" />
    </div>

    <template v-else-if="subject">
      <!-- header — subject-tinted hero -->
      <div class="subject-block p-5 sm:p-6" :style="{ '--subject': subject.color }">
        <div class="flex flex-wrap items-start justify-between gap-3 pl-2.5">
          <div class="flex items-start gap-3">
            <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold text-white shadow-[0_12px_28px_-10px_rgba(15,20,40,0.4)]"
                  :style="{ background: subject.color }">
              {{ (subject.code ?? subject.name).slice(0, 2).toUpperCase() }}
            </span>
            <div>
              <h2 class="t-page">{{ subject.name }}</h2>
              <p class="mt-1 text-sm text-night-700 dark:text-night-100 font-medium">
                <span v-if="subject.code">{{ subject.code }} · </span>
                <span v-if="subject.lecturer">{{ subject.lecturer }} · </span>
                {{ classes.length }} class{{ classes.length === 1 ? '' : 'es' }} a week
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" @click="$router.push(`/study?subject=${subject.id}`)">
              <Icon name="play" :size="14" /> Start study
            </Button>
            <Button size="sm" variant="secondary" @click="$router.push(`/assignments?new=1&subject=${subject.id}`)">
              <Icon name="plus" :size="14" /> Add task
            </Button>
            <Button size="sm" variant="secondary" @click="$router.push(`/notes?new=1&subject=${subject.id}`)">
              <Icon name="notes" :size="14" /> Add note
            </Button>
          </div>
        </div>
      </div>

      <!-- next class strip -->
      <div v-if="nextClass" class="card flex items-center gap-3 px-4 py-3">
        <span class="h-8 w-1 shrink-0 rounded-full" :style="{ background: subject.color }" />
        <div class="min-w-0 flex-1 text-sm">
          <span class="t-eyebrow mr-2">Next class</span>
          <span class="font-semibold text-night-900 dark:text-white">{{ WEEKDAY_LONG[nextClass.c.weekday] }} {{ fmtTime(nextClass.c.start_time) }}</span>
          <span v-if="nextClass.c.room" class="text-night-600 dark:text-night-200"> · Room {{ nextClass.c.room }}</span>
        </div>
        <span class="chip-brand shrink-0">
          in {{ humanCountdown(nextClass.start, now) }}
        </span>
      </div>

      <!-- projects for this subject -->
      <div v-if="subjectProjects.length" class="flex flex-wrap gap-2">
        <RouterLink v-for="p in subjectProjects" :key="p.id" :to="`/projects/${p.id}`"
                    class="tile tile-hover flex items-center gap-2.5 px-3 py-2 text-sm">
          <span class="grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold text-white"
                :style="{ background: p.color ?? '#5B7BD4' }">{{ p.name.slice(0,1).toUpperCase() }}</span>
          <span class="font-medium">{{ p.name }}</span>
          <span class="text-xs text-night-500 dark:text-night-300">{{ p.progress }}%</span>
        </RouterLink>
      </div>

      <div class="grid gap-5 lg:grid-cols-2">
        <!-- assignments -->
        <Card>
          <div class="mb-3 flex items-center justify-between">
            <h3 class="t-card">Tasks</h3>
            <RouterLink :to="`/assignments?new=1&subject=${subject.id}`" class="link text-xs">Add one →</RouterLink>
          </div>
          <p v-if="!openAssignments.length" class="py-4 text-center text-sm text-night-500 dark:text-night-300">
            Nothing due for this subject. Nice.
          </p>
          <ul v-else class="divide-y divide-surface-border dark:divide-night-700">
            <li v-for="a in openAssignments" :key="a.id" class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <button class="relative after:absolute after:-inset-1.5 after:content-[''] h-6 w-6 shrink-0 rounded-full border-2 border-night-300 transition-colors hover:border-brand-500 dark:border-night-500"
                      aria-label="Mark done" @click="assignments.toggleComplete(a.id)" />
              <RouterLink :to="`/assignments?id=${a.id}`" class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium">{{ a.title }}</div>
                <div v-if="dueDate(a)" class="text-xs"
                     :class="dueDate(a)! < now ? 'font-medium text-red-500' : 'text-night-500 dark:text-night-300'">
                  {{ dueLabel(dueDate(a)!, now) }}
                </div>
              </RouterLink>
            </li>
          </ul>
        </Card>

        <!-- notes -->
        <Card>
          <div class="mb-3 flex items-center justify-between">
            <h3 class="t-card">Notes</h3>
            <RouterLink :to="`/notes?new=1&subject=${subject.id}`" class="link text-xs">New note →</RouterLink>
          </div>
          <p v-if="!subjectNotes.length" class="py-4 text-center text-sm text-night-500 dark:text-night-300">
            No notes for this subject yet.
          </p>
          <ul v-else class="space-y-1">
            <li v-for="n in subjectNotes" :key="n.id">
              <RouterLink :to="`/notes?id=${n.id}`"
                          class="-mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :style="{ background: n.color ?? subject.color }" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{{ n.title || 'Untitled note' }}</span>
                  <span class="block truncate text-xs text-night-500 dark:text-night-300">{{ n.body }}</span>
                </span>
              </RouterLink>
            </li>
          </ul>
        </Card>

        <!-- weekly times -->
        <Card>
          <h3 class="t-card mb-3">Class times</h3>
          <EmptyState v-if="!classes.length" icon="schedule" title="No classes" body="Add one from the schedule." />
          <ul v-else class="divide-y divide-surface-border dark:divide-night-700">
            <li v-for="c in classes" :key="c.id" class="flex items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
              <span class="w-24 shrink-0 font-medium">{{ WEEKDAY_LONG[c.weekday] }}</span>
              <span class="flex-1 tabular-nums text-night-500 dark:text-night-300">
                {{ fmtTime(c.start_time) }} – {{ fmtTime(c.end_time) }}
              </span>
              <span v-if="c.room" class="chip">Room {{ c.room }}</span>
            </li>
          </ul>
        </Card>

        <!-- study history -->
        <Card>
          <div class="mb-3 flex items-center justify-between">
            <h3 class="t-card">Your study time</h3>
            <span class="chip tabular-nums">{{ secondsToClock(totalStudied) }} total</span>
          </div>
          <p v-if="!sessions.length" class="py-4 text-center text-sm text-night-500 dark:text-night-300">
            No study sessions yet — hit Start study above.
          </p>
          <ul v-else class="divide-y divide-surface-border dark:divide-night-700">
            <li v-for="s in sessions" :key="s.id" class="flex items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
              <div class="min-w-0 flex-1">
                <div class="truncate font-medium">{{ s.topic || 'Study session' }}</div>
                <div class="text-xs text-night-500 dark:text-night-300">{{ fmtDate(s.started_at, { month:'short', day:'numeric' }) }}</div>
              </div>
              <span class="chip tabular-nums">{{ secondsToClock(s.duration_seconds) }}</span>
            </li>
          </ul>
        </Card>
      </div>
    </template>

    <EmptyState v-else icon="search" title="Subject not found" body="It may have been deleted." />
  </div>
</template>
