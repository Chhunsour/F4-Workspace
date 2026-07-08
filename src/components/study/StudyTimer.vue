<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useStudyStore } from '@/stores/study'
import { useSubjectsStore } from '@/stores/subjects'
import { useNow } from '@/composables/useCountdown'
import { secondsToClock } from '@/lib/utils'
import Card from '@/components/ui/Card.vue'
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

// Preselect subject when arriving via "Start study" on a subject/class page.
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
  <Card :class="props.hero ? '!p-6 bg-brand-700 text-white border-brand-700' : ''">
    <div class="flex items-center justify-between mb-3">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.06em]" :class="props.hero ? 'text-brand-100' : 'text-night-400 dark:text-night-300'">{{ t('Study timer') }}</p>
        <h3 class="font-semibold" :class="props.hero ? 'text-white' : 'text-night-900 dark:text-white'">
          {{ running ? t('On now') : paused ? t('Paused') : t('Ready when you are') }}
        </h3>
      </div>
      <div class="text-3xl font-semibold tabular-nums" :class="running ? 'animate-[none]' : ''">{{ secondsToClock(elapsed) }}</div>
    </div>

    <div v-if="!study.active" class="grid gap-2 sm:grid-cols-2">
      <Select v-model="subjectId" :options="subjectOptions" :placeholder="t('What are you studying?')" />
      <Input v-model="topic" :placeholder="t('What topic? (optional)')" />
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <template v-if="!study.active">
        <Button size="lg" :variant="props.hero ? 'accent' : 'primary'" @click="start(false)"><Icon name="play" :size="16" /> {{ t('Start') }}</Button>
        <Button size="lg" variant="secondary" @click="start(true)"><Icon name="fire" :size="16" /> {{ t('Focus mode') }}</Button>
      </template>
      <template v-else>
        <Button size="lg" v-if="running" @click="study.pause"><Icon name="pause" :size="16" /> {{ t('Pause') }}</Button>
        <Button size="lg" v-else @click="study.resume"><Icon name="play" :size="16" /> {{ t('Resume') }}</Button>
        <Button size="lg" variant="accent" @click="complete"><Icon name="check" :size="16" /> {{ t('Complete') }}</Button>
        <Button size="lg" variant="ghost" @click="cancel">{{ t('Cancel') }}</Button>
      </template>
    </div>

    <p v-if="study.active" class="mt-3 text-xs" :class="props.hero ? 'text-brand-100' : 'text-night-500 dark:text-night-300'">
      {{ subjects.byId(study.active.subjectId)?.name ?? t('No subject') }}<span v-if="study.active.topic"> · {{ study.active.topic }}</span>
    </p>
  </Card>
</template>
