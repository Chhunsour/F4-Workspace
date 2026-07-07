<script setup lang="ts">
import { computed } from 'vue'
import { useStudyStore } from '@/stores/study'
import { useSubjectsStore } from '@/stores/subjects'
import { useNow } from '@/composables/useCountdown'
import { secondsToClock } from '@/lib/utils'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import { useToast } from '@/composables/useToast'
import { useRouter } from 'vue-router'

const study = useStudyStore()
const subjects = useSubjectsStore()
const now = useNow()
const toast = useToast()
const router = useRouter()

const elapsed = computed(() => study.elapsedSeconds(now.value.getTime()))
const active = computed(() => study.active)

async function complete() {
  await study.complete(); toast.success('Great session!'); router.push('/study')
}
async function cancel() { await study.cancel(); router.push('/study') }
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center bg-night-950 text-white p-6">
    <div class="text-center max-w-xl">
      <div class="text-[11px] font-semibold uppercase tracking-[0.25em] text-night-300">Focus mode</div>
      <div class="mt-5 text-7xl sm:text-8xl font-semibold tabular-nums leading-none">{{ secondsToClock(elapsed) }}</div>

      <div v-if="active" class="mt-6">
        <div class="inline-flex items-center gap-2 bg-night-800 border border-night-700 px-3.5 py-1.5 rounded-full text-sm">
          <span class="h-2 w-2 rounded-full" :style="{ background: subjects.byId(active.subjectId)?.color ?? '#ffca47' }" />
          {{ subjects.byId(active.subjectId)?.name ?? 'General study' }}
          <span v-if="active.topic" class="text-night-300">· {{ active.topic }}</span>
        </div>
      </div>
      <p v-else class="mt-6 text-night-300">No session running. Head back to Study and start one.</p>

      <div class="mt-8 flex justify-center gap-3">
        <template v-if="active">
          <Button v-if="!active.pausedAt" variant="secondary" @click="study.pause"><Icon name="pause" :size="16" /> Pause</Button>
          <Button v-else variant="secondary" @click="study.resume"><Icon name="play" :size="16" /> Resume</Button>
          <Button variant="accent" @click="complete"><Icon name="check" :size="16" /> Complete</Button>
          <Button variant="ghost" class="text-white" @click="cancel">Cancel</Button>
        </template>
        <template v-else>
          <Button variant="secondary" @click="router.push('/study')">Go to study</Button>
        </template>
      </div>

      <p class="mt-10 text-xs text-white/40">Tip: close notifications and put your phone screen-down. You've got this.</p>
    </div>
  </div>
</template>
