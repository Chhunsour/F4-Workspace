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
const running = computed(() => !!active.value && !active.value.pausedAt)

async function complete() {
  await study.complete(); toast.success('Great session!'); router.push('/study')
}
async function cancel() { await study.cancel(); router.push('/study') }
</script>

<template>
  <!-- Full-bleed dark-grey canvas with a restrained brand glow. Minimal controls. -->
  <div class="relative min-h-dvh overflow-hidden bg-[#18191C] text-[#F5F6F8] flex items-center justify-center p-6">
    <!-- Ambient brand glow, slow pulse. Only softly visible on the grey bg. -->
    <div aria-hidden class="pointer-events-none absolute inset-0">
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full blur-[100px]"
           style="background: radial-gradient(circle, rgba(91,123,212,0.16), transparent 65%);"
           :class="running && 'animate-brandGlow'" />
      <div class="absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full blur-[110px]"
           style="background: radial-gradient(circle, rgba(255,255,255,0.04), transparent 65%);" />
      <div class="absolute -top-40 -left-40 h-[380px] w-[380px] rounded-full blur-[100px]"
           style="background: radial-gradient(circle, rgba(91,123,212,0.08), transparent 65%);" />
    </div>

    <div class="relative text-center max-w-2xl">
      <div class="text-[11px] font-bold uppercase tracking-[0.32em] text-[#8F95A3] flex items-center justify-center gap-2">
        <span v-if="running" class="inline-block h-1.5 w-1.5 rounded-full bg-brand-400 animate-livePulse shadow-[0_0_10px_rgba(91,123,212,0.9)]" />
        Focus mode
      </div>

      <!-- Big timer with subtle brand text glow -->
      <div class="mt-6 text-[96px] sm:text-[128px] font-bold tabular-nums leading-none tracking-tight"
           :style="{ textShadow: running ? '0 0 52px rgba(91,123,212,0.34)' : '0 0 34px rgba(91,123,212,0.16)' }">
        {{ secondsToClock(elapsed) }}
      </div>

      <div v-if="active" class="mt-8">
        <div class="inline-flex items-center gap-2.5 border border-white/[0.08] bg-[#26282D]/90 px-4 py-2 rounded-full text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur">
          <span class="h-2 w-2 rounded-full" :style="{ background: subjects.byId(active.subjectId)?.color ?? '#ffca47' }" />
          {{ subjects.byId(active.subjectId)?.name ?? 'General study' }}
          <span v-if="active.topic" class="text-[#C5C8D0]">· {{ active.topic }}</span>
        </div>
      </div>
      <p v-else class="mt-8 text-[#C5C8D0]">No session running. Head back to Study and start one.</p>

      <div class="mt-10 flex justify-center gap-3">
        <template v-if="active">
          <Button v-if="!active.pausedAt" variant="secondary" @click="study.pause"><Icon name="pause" :size="16" /> Pause</Button>
          <Button v-else @click="study.resume"><Icon name="play" :size="16" /> Resume</Button>
          <Button variant="success" @click="complete"><Icon name="check" :size="16" /> Complete</Button>
          <Button variant="ghost" class="!text-[#C5C8D0] hover:!text-[#F5F6F8]" @click="cancel">Cancel</Button>
        </template>
        <template v-else>
          <Button @click="router.push('/study')">Go to study</Button>
        </template>
      </div>

      <p class="mt-12 text-[11px] font-medium tracking-wide text-[#747B89]">Tip: silence notifications and put your phone screen-down. You've got this.</p>
    </div>
  </div>
</template>
