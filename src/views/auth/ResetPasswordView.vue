<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from './AuthLayout.vue'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'

const p1 = ref(''); const p2 = ref('')
const err = ref<Record<string,string>>({})
const formError = ref('')
const loading = ref(false)
const done = ref(false)
const auth = useAuthStore(); const router = useRouter()
const { t } = useI18n()

async function submit() {
  err.value = {}
  formError.value = ''
  if (p1.value.length < 6) err.value.p1 = t('At least 6 characters')
  if (p1.value !== p2.value) err.value.p2 = t('Passwords do not match')
  if (Object.keys(err.value).length) return
  loading.value = true
  try {
    await auth.updatePassword(p1.value)
    done.value = true
    // The recovery link already signed the user in — land them on the dashboard.
    setTimeout(() => router.replace('/'), 1400)
  } catch (e: any) {
    formError.value = e?.message ?? t('Could not update the password. Please try again.')
  } finally { loading.value = false }
}
</script>

<template>
  <AuthLayout>
    <transition name="fade" mode="out-in">
      <div v-if="!done" key="form">
        <h1 class="text-2xl font-semibold tracking-tight">{{ t('Choose a new password') }}</h1>
        <p class="mt-1 text-sm text-night-500 dark:text-night-300">
          {{ t('You\'re signed in via the reset link — just set the new password.') }}
        </p>

        <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
          <PasswordInput v-model="p1" :label="t('New password')" autocomplete="new-password"
                         :hint="t('At least 6 characters')" :error="err.p1" required />
          <PasswordInput v-model="p2" :label="t('Confirm password')" autocomplete="new-password"
                         :error="err.p2" required />
          <p v-if="formError" role="alert"
             class="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/25 dark:text-red-200">
            {{ formError }}
          </p>
          <Button type="submit" size="lg" :loading="loading" class="w-full">{{ t('Update password') }}</Button>
        </form>
      </div>

      <div v-else key="done" class="py-2 text-center">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
          <Icon name="check" :size="22" />
        </span>
        <h1 class="mt-4 text-xl font-semibold tracking-tight">{{ t('Password updated') }}</h1>
        <p class="mt-2 text-sm text-night-500 dark:text-night-300">{{ t('Taking you to your dashboard…') }}</p>
        <Button class="mt-6 w-full" @click="router.replace('/')">{{ t('Go now') }}</Button>
      </div>
    </transition>
  </AuthLayout>
</template>
