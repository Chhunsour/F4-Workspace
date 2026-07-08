<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import { useStudyStore } from '@/stores/study'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useI18n } from '@/composables/useI18n'

const theme = useThemeStore()
const auth = useAuthStore()
const study = useStudyStore()
const confirm = useConfirm()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const goal = ref(study.weeklyGoalMinutes)
watch(() => study.weeklyGoalMinutes, v => { goal.value = v })
const savingGoal = ref(false)
async function saveGoal() {
  const v = Math.max(30, Number(goal.value) || 600)
  savingGoal.value = true
  try {
    await auth.updateProfile({ weekly_goal_minutes: v })
    toast.success(t('Weekly goal saved'))
  } catch (e: any) { toast.error(t('Could not save goal'), e?.message) }
  finally { savingGoal.value = false }
}

const themes = [
  { value: 'light', label: 'Light', hint: 'Bright, high contrast' },
  { value: 'dark',  label: 'Dark',  hint: 'Easy on the eyes' },
  { value: 'system',label: 'System',hint: 'Follow your OS setting' },
]

async function doSignOut() {
  const ok = await confirm.ask({ title: t('Sign out?'), confirmLabel: t('Sign out') })
  if (!ok) return
  await auth.signOut()
  router.replace('/sign-in')
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div>
      <h2 class="t-page">{{ t('Settings') }}</h2>
      <p class="mt-1 text-sm text-night-600 dark:text-night-200">{{ t('Theme, study goals, account.') }}</p>
    </div>

    <Card>
      <h3 class="t-card mb-3">{{ t('Theme') }}</h3>
      <div class="grid gap-2 sm:grid-cols-3">
        <button v-for="themeOption in themes" :key="themeOption.value" type="button"
          @click="theme.setMode(themeOption.value as any)"
          :class="['text-left rounded-xl border p-3 transition-all',
                   theme.mode === themeOption.value
                     ? '!border-brand-500 bg-brand-500/8 dark:bg-brand-400/12 ring-2 ring-brand-500/25 -translate-y-0.5'
                     : 'border-[var(--card-border)] hover:border-brand-300 hover:bg-brand-500/[0.03] dark:hover:bg-brand-400/[0.06]']">
          <div class="font-semibold text-night-900 dark:text-white">{{ t(themeOption.label) }}</div>
          <div class="text-xs text-night-500 dark:text-night-200 mt-0.5">{{ t(themeOption.hint) }}</div>
        </button>
      </div>
    </Card>

    <Card>
      <h3 class="t-card mb-3">{{ t('Language') }}</h3>
      <p class="mb-3 text-sm text-night-500 dark:text-night-300">{{ t('Choose the language used across Team F4.') }}</p>
      <LanguageSwitcher />
    </Card>

    <Card>
      <h3 class="t-card mb-3">{{ t('Study goals') }}</h3>
      <div class="flex flex-wrap items-end gap-3">
        <div class="w-full sm:w-64">
          <Input v-model="goal as any" type="number" min="30" step="30" :label="t('Weekly goal (minutes)')" :hint="t('Default: 600 min = 10 hours')" />
        </div>
        <Button :loading="savingGoal" @click="saveGoal">{{ t('Save') }}</Button>
      </div>
    </Card>

    <Card>
      <h3 class="t-card mb-3">{{ t('Account') }}</h3>
      <div class="text-sm text-night-600 dark:text-night-200 mb-3">{{ t('Signed in as') }} <span class="font-semibold text-night-900 dark:text-white">{{ auth.email }}</span></div>
      <Button variant="danger" @click="doSignOut">{{ t('Sign out') }}</Button>
    </Card>
  </div>
</template>
