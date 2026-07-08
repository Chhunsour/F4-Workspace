<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useScheduleStore } from '@/stores/schedule'
import { useSubjectsStore } from '@/stores/subjects'
import { useNow } from '@/composables/useCountdown'
import { humanCountdown, fmtTime, WEEKDAY_LONG } from '@/lib/utils'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import { useI18n } from '@/composables/useI18n'

const schedule = useScheduleStore()
const subjects = useSubjectsStore()
const now = useNow()
const router = useRouter()
const { t } = useI18n()

const next = computed(() => schedule.nextClassAt(now.value))

const info = computed(() => {
  const n = next.value; if (!n) return null
  const sub = subjects.byId(n.subject_id)
  const now_ = now.value
  const day = new Date(now_)
  const delta = (n.weekday - day.getDay() + 7) % 7
  day.setDate(day.getDate() + delta)
  const [sh, sm] = n.start_time.split(':').map(Number)
  const start = new Date(day); start.setHours(sh, sm, 0, 0)
  const [eh, em] = n.end_time.split(':').map(Number)
  const end   = new Date(day); end.setHours(eh, em, 0, 0)
  const started = now_.getTime() >= start.getTime() && now_.getTime() < end.getTime()
  return {
    subject: sub, class: n, start, end, started,
    countdown: started ? t('Ends at {time}', { time: fmtTime(n.end_time) }) : t('in {time}', { time: humanCountdown(start, now_) }),
    dayLabel: delta === 0 ? t('Today') : delta === 1 ? t('Tomorrow') : t(WEEKDAY_LONG[n.weekday]),
  }
})
</script>

<template>
  <div class="card p-5 sm:p-6">
    <template v-if="info">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="t-section flex items-center gap-1.5">
            <span v-if="info.started" class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {{ info.started ? t('Now') : t('Next up') }}
          </p>
          <h2 class="mt-1 truncate text-2xl font-semibold tracking-tight text-night-900 dark:text-night-50">
            {{ info.subject?.name ?? t('Unnamed subject') }}
          </h2>
          <p class="mt-0.5 text-sm text-night-500 dark:text-night-300">
            {{ info.dayLabel }} · {{ fmtTime(info.class.start_time) }} – {{ fmtTime(info.class.end_time) }}<span v-if="info.class.room"> · {{ t('Room {room}', { room: info.class.room }) }}</span>
          </p>
        </div>
        <span :class="['shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold',
                       info.started
                         ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                         : 'bg-accent-100 text-accent-700 dark:bg-accent-300/15 dark:text-accent-300']">
          {{ info.countdown }}
        </span>
      </div>

      <div v-if="info.subject" class="mt-4 flex flex-wrap gap-2">
        <Button size="sm" @click="router.push(`/study?subject=${info.subject.id}`)">
          <Icon name="play" :size="14" /> {{ t('Start study') }}
        </Button>
        <Button size="sm" variant="secondary" @click="router.push(`/notes?new=1&subject=${info.subject.id}`)">
          <Icon name="notes" :size="14" /> {{ t('Add note') }}
        </Button>
        <Button size="sm" variant="secondary" @click="router.push(`/subjects/${info.subject.id}`)">
          {{ t('Open subject') }}
        </Button>
      </div>
    </template>

    <template v-else>
      <p class="t-section">{{ t('Next up') }}</p>
      <h2 class="mt-1 text-xl font-semibold">{{ t('Nothing scheduled') }}</h2>
      <p class="mt-0.5 text-sm text-night-500 dark:text-night-300">
        <RouterLink to="/schedule" class="link">{{ t('Add your classes') }}</RouterLink> {{ t('and your week shows up here.') }}
      </p>
    </template>
  </div>
</template>
