<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import AuthLayout from './AuthLayout.vue'
import Input from '@/components/ui/Input.vue'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import Button from '@/components/ui/Button.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'

const email = ref('')
const password = ref('')
const loading = ref(false)
const err = ref<Record<string, string>>({})
const formError = ref('')

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const { t } = useI18n()

async function submit() {
  err.value = {}
  formError.value = ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) err.value.email = t('Enter a valid email')
  if (!password.value) err.value.password = t('Enter your password')
  if (Object.keys(err.value).length) return
  loading.value = true
  try {
    await auth.signIn(email.value.trim(), password.value)
    toast.success(t('Welcome back'), t('Signed in successfully'))
    router.replace((route.query.next as string) || '/')
  } catch (e: any) {
    formError.value = e?.message ?? t('Sign in failed. Please try again.')
  } finally { loading.value = false }
}
</script>

<template>
  <AuthLayout>
    <span class="chip">Batch 22 · Evening</span>
    <h1 class="mt-3 text-2xl font-semibold tracking-tight">{{ t('Welcome back') }}</h1>
    <p class="mt-1 text-sm text-night-500 dark:text-night-300">{{ t('Check what\'s next and keep your week moving.') }}</p>

    <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
      <Input v-model="email" type="email" :label="t('Email')" autocomplete="email" autofocus
             placeholder="you@university.edu" :error="err.email" required />
      <div>
        <PasswordInput v-model="password" :label="t('Password')" autocomplete="current-password"
                       :placeholder="t('Your password')" :error="err.password" required />
        <div class="mt-1.5 flex justify-end">
          <RouterLink to="/forgot-password" class="link text-xs">{{ t('Forgot password?') }}</RouterLink>
        </div>
      </div>
      <p v-if="formError" role="alert"
         class="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/25 dark:text-red-200">
        {{ formError }}
      </p>
      <Button type="submit" size="lg" :loading="loading" class="w-full">{{ t('Sign in') }}</Button>
    </form>

    <p class="mt-6 text-center text-sm text-night-500 dark:text-night-300">
      {{ t('New here?') }}
      <RouterLink to="/sign-up" class="link">{{ t('Create an account') }}</RouterLink>
    </p>
  </AuthLayout>
</template>
