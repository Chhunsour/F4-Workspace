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
  <!-- Hero surface — brand-tinted, subject-color accent strip, countdown chip -->
  <div class="hero-surface p-5 sm:p-7">
    <template v-if="info">
      <!-- Subject color bar overlay (behind the ::before brand+accent gradient) -->
      <span v-if="info.subject" aria-hidden
            class="absolute left-0 top-0 h-full w-1"
            :style="{ background: info.subject.color }" />

      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <p class="t-eyebrow flex items-center gap-1.5">
            <span v-if="info.started" class="relative inline-flex h-1.5 w-1.5">
              <span class="absolute inset-0 rounded-full bg-grass-500 animate-livePulse" />
            </span>
            {{ info.started ? t('Now') : t('Next class') }}
          </p>
          <h2 class="mt-1.5 truncate text-[26px] sm:text-[30px] font-bold tracking-tight text-night-900 dark:text-white">
            {{ info.subject?.name ?? t('Unnamed subject') }}
          </h2>
          <p class="mt-1 text-sm text-night-600 dark:text-night-100 flex items-center gap-1.5 flex-wrap">
            <Icon name="clock" :size="14" class="opacity-60" />
            <span class="tabular-nums">{{ fmtTime(info.class.start_time) }} – {{ fmtTime(info.class.end_time) }}</span>
            <span v-if="info.class.room" class="text-night-500 dark:text-night-200">·</span>
            <span v-if="info.class.room">{{ t('Room {room}', { room: info.class.room }) }}</span>
            <span class="text-night-500 dark:text-night-200">·</span>
            <span>{{ info.dayLabel }}</span>
          </p>
        </div>
        <span :class="['shrink-0',
                       info.started ? 'chip-live' : 'chip-brand',
                       'text-[13px] px-3 py-1.5']">
          {{ info.countdown }}
        </span>
      </div>

      <div v-if="info.subject" class="mt-5 flex flex-wrap gap-2">
        <Button size="sm" @click="router.push(`/study?subject=${info.subject.id}`)">
          <Icon name="play" :size="14" /> {{ t('Start study') }}
        </Button>
        <Button size="sm" variant="secondary" @click="router.push(`/notes?new=1&subject=${info.subject.id}`)">
          <Icon name="notes" :size="14" /> {{ t('Add note') }}
        </Button>
        <Button size="sm" variant="ghost" @click="router.push(`/subjects/${info.subject.id}`)">
          {{ t('Open subject') }}
          <Icon name="chevron_right" :size="14" />
        </Button>
      </div>
    </template>

    <template v-else>
      <p class="t-eyebrow">{{ t('Next class') }}</p>
      <h2 class="mt-1.5 text-2xl font-bold tracking-tight">{{ t('Nothing scheduled') }}</h2>
      <p class="mt-1 text-sm text-night-600 dark:text-night-100">
        <RouterLink to="/schedule" class="link">{{ t('Add your classes') }}</RouterLink> {{ t('and your week shows up here.') }}
      </p>
    </template>
  </div>
</template>
