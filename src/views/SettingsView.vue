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
import { useConfirm } from '@/composables/useConfirm'

const theme = useThemeStore()
const auth = useAuthStore()
const study = useStudyStore()
const confirm = useConfirm()
const router = useRouter()
const toast = useToast()

const goal = ref(study.weeklyGoalMinutes)
watch(() => study.weeklyGoalMinutes, v => { goal.value = v })
const savingGoal = ref(false)
async function saveGoal() {
  const v = Math.max(30, Number(goal.value) || 600)
  savingGoal.value = true
  try {
    await auth.updateProfile({ weekly_goal_minutes: v })
    toast.success('Weekly goal saved')
  } catch (e: any) { toast.error('Could not save goal', e?.message) }
  finally { savingGoal.value = false }
}

const themes = [
  { value: 'light', label: 'Light', hint: 'Bright, high contrast' },
  { value: 'dark',  label: 'Dark',  hint: 'Easy on the eyes' },
  { value: 'system',label: 'System',hint: 'Follow your OS setting' },
]

async function doSignOut() {
  const ok = await confirm.ask({ title: 'Sign out?', confirmLabel: 'Sign out' })
  if (!ok) return
  await auth.signOut()
  router.replace('/sign-in')
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-semibold">Settings</h2>
      <p class="text-sm text-night-500">Theme, study goals, account.</p>
    </div>

    <Card>
      <h3 class="font-semibold mb-3">Theme</h3>
      <div class="grid gap-2 sm:grid-cols-3">
        <button v-for="t in themes" :key="t.value" type="button"
          @click="theme.setMode(t.value as any)"
          :class="['text-left rounded-xl border p-3 transition-colors',
                   theme.mode === t.value ? 'border-brand-500 ring-2 ring-brand-200 dark:ring-brand-900' : 'border-surface-border dark:border-night-700 hover:bg-night-50 dark:hover:bg-night-800']">
          <div class="font-medium">{{ t.label }}</div>
          <div class="text-xs text-night-500">{{ t.hint }}</div>
        </button>
      </div>
    </Card>

    <Card>
      <h3 class="font-semibold mb-3">Study goals</h3>
      <div class="flex flex-wrap items-end gap-3">
        <div class="w-full sm:w-64">
          <Input v-model="goal as any" type="number" min="30" step="30" label="Weekly goal (minutes)" hint="Default: 600 min = 10 hours" />
        </div>
        <Button :loading="savingGoal" @click="saveGoal">Save</Button>
      </div>
    </Card>

    <Card>
      <h3 class="font-semibold mb-3">Account</h3>
      <div class="text-sm text-night-500 mb-3">Signed in as <span class="font-medium text-night-900 dark:text-night-50">{{ auth.email }}</span></div>
      <Button variant="danger" @click="doSignOut">Sign out</Button>
    </Card>
  </div>
</template>
