<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useStudyStore } from '@/stores/study'
import { useSubjectsStore } from '@/stores/subjects'
import { useNow } from '@/composables/useCountdown'
import { secondsToClock } from '@/lib/utils'
import Button from '@/components/ui/Button.vue'
import Select from '@/components/ui/Select.vue'
import Input from '@/components/ui/Input.vue'
import Icon from '@/components/ui/Icon.vue'
import { useToast } from '@/composables/useToast'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{ hero?: boolean; initialSubject?: string | null }>()

const study = useStudyStore()
const subjects = useSubjectsStore()
const toast = useToast()
const now = useNow()
const router = useRouter()
const { t } = useI18n()

const subjectId = ref<string | null>(null)
const topic = ref('')

watch(() => props.initialSubject, (id) => { if (id && !study.active) subjectId.value = id }, { immediate: true })

const elapsed = computed(() => study.elapsedSeconds(now.value.getTime()))
const running = computed(() => !!study.active && !study.active.pausedAt)
const paused  = computed(() => !!study.active?.pausedAt)

const subjectOptions = computed(() => subjects.items.map(s => ({ value: s.id, label: s.name })))

async function start(focus = false) {
  try {
    await study.start(subjectId.value, topic.value, focus)
    toast.success(t('Timer started'))
    if (focus) router.push('/focus')
  } catch (e: any) { toast.error(t('Could not start'), e?.message) }
}
async function complete() {
  const mins = Math.max(1, Math.round(study.elapsedSeconds(Date.now()) / 60))
  try {
    await study.complete()
    toast.success(t('Nice work.'), t('{count} minutes focused · this week {time}', { count: mins, time: secondsToClock(study.totalThisWeek) }))
  } catch (e: any) { toast.error(t('Could not save session'), e?.message) }
}
async function cancel() { await study.cancel(); toast.info(t('Session cancelled')) }
</script>

<template>
  <!-- Hero variant = the What are you studying? panel on /study.
       Non-hero = compact card (unused today; kept for future embeds). -->
  <div :class="props.hero ? 'hero-surface p-6 sm:p-8' : 'card p-5'">
    <div class="flex items-center justify-between mb-4">
      <div>
        <p class="t-eyebrow">{{ t('Study timer') }}</p>
        <h3 class="mt-1 text-[22px] sm:text-[26px] font-bold tracking-tight text-night-900 dark:text-white">
          {{ running ? t('On now') : paused ? t('Paused') : t('What are you studying?') }}
        </h3>
      </div>
      <div class="text-4xl sm:text-5xl font-bold tabular-nums text-brand-700 dark:text-brand-200"
           :class="running && 'animate-livePulse'">{{ secondsToClock(elapsed) }}</div>
    </div>

    <div v-if="!study.active" class="grid gap-2 sm:grid-cols-2">
      <Select v-model="subjectId" :options="subjectOptions" :placeholder="t('Select subject')" />
      <Input v-model="topic" :placeholder="t('What topic? (optional)')" />
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <template v-if="!study.active">
        <Button size="lg" variant="primary" @click="start(false)"><Icon name="play" :size="16" /> {{ t('Start study') }}</Button>
        <Button size="lg" variant="secondary" @click="start(true)"><Icon name="fire" :size="16" /> {{ t('Focus mode') }}</Button>
      </template>
      <template v-else>
        <Button size="lg" v-if="running" variant="secondary" @click="study.pause"><Icon name="pause" :size="16" /> {{ t('Pause') }}</Button>
        <Button size="lg" v-else @click="study.resume"><Icon name="play" :size="16" /> {{ t('Resume') }}</Button>
        <Button size="lg" variant="success" @click="complete"><Icon name="check" :size="16" /> {{ t('Complete') }}</Button>
        <Button size="lg" variant="ghost" @click="cancel">{{ t('Cancel') }}</Button>
      </template>
    </div>

    <p v-if="study.active" class="mt-4 text-sm font-medium text-night-700 dark:text-night-100 flex items-center gap-2">
      <span class="inline-block h-2 w-2 rounded-full bg-brand-500 animate-livePulse shadow-[0_0_8px_rgba(91,123,212,0.7)]" />
      {{ subjects.byId(study.active.subjectId)?.name ?? t('No subject') }}<span v-if="study.active.topic"> · {{ study.active.topic }}</span>
    </p>
  </div>
</template>
