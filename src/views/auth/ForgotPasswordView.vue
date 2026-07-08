<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AuthLayout from './AuthLayout.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const err = ref('')
const formError = ref('')
const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

async function submit() {
  err.value = ''
  formError.value = ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { err.value = t('Enter a valid email'); return }
  loading.value = true
  try {
    await auth.requestPasswordReset(email.value.trim())
    sent.value = true
  } catch (e: any) {
    formError.value = e?.message ?? t('Could not send the reset link. Please try again.')
  } finally { loading.value = false }
}
</script>

<template>
  <AuthLayout>
    <transition name="fade" mode="out-in">
      <div v-if="!sent" key="form">
        <h1 class="text-2xl font-semibold tracking-tight">{{ t('Reset your password') }}</h1>
        <p class="mt-1 text-sm text-night-500 dark:text-night-300">
          {{ t('Enter your email and we\'ll send you a link to set a new one.') }}
        </p>

        <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
          <Input v-model="email" type="email" :label="t('Email')" autocomplete="email" autofocus
                 placeholder="you@university.edu" :error="err" required />
          <p v-if="formError" role="alert"
             class="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/25 dark:text-red-200">
            {{ formError }}
          </p>
          <Button type="submit" size="lg" :loading="loading" class="w-full">{{ t('Send reset link') }}</Button>
        </form>

        <p class="mt-6 text-center text-sm text-night-500 dark:text-night-300">
          {{ t('Remembered it?') }}
          <RouterLink to="/sign-in" class="link">{{ t('Back to sign in') }}</RouterLink>
        </p>
      </div>

      <div v-else key="sent" class="py-2 text-center">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
          <Icon name="mail" :size="22" />
        </span>
        <h1 class="mt-4 text-xl font-semibold tracking-tight">{{ t('Check your email') }}</h1>
        <p class="mt-2 text-sm leading-relaxed text-night-500 dark:text-night-300">
          {{ t('We sent a reset link to') }}
          <span class="font-medium text-night-900 dark:text-white">{{ email }}</span>.
          {{ t('It expires in 1 hour.') }}
        </p>
        <Button variant="secondary" class="mt-6 w-full" @click="router.push('/sign-in')">{{ t('Back to sign in') }}</Button>
      </div>
    </transition>
  </AuthLayout>
</template>
