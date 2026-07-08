<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import AuthLayout from './AuthLayout.vue'
import Input from '@/components/ui/Input.vue'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'

const fullName = ref('')
const email = ref('')
const password = ref('')
const password2 = ref('')
const loading = ref(false)
const err = ref<Record<string,string>>({})
const formError = ref('')
// Email confirmations on: no session comes back, so we show the check-your-inbox state.
const sent = ref(false)

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

async function submit() {
  err.value = {}
  formError.value = ''
  if (!fullName.value.trim()) err.value.fullName = t('Enter your full name')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) err.value.email = t('Enter a valid email')
  if (password.value.length < 6) err.value.password = t('At least 6 characters')
  if (password.value !== password2.value) err.value.password2 = t('Passwords do not match')
  if (Object.keys(err.value).length) return

  loading.value = true
  try {
    const result = await auth.signUp(email.value.trim(), password.value, fullName.value.trim())
    if (!result?.session) {
      sent.value = true
    } else {
      toast.success(t('Welcome to Uni Life'))
      router.replace('/')
    }
  } catch (e: any) {
    formError.value = e?.message ?? t('Sign up failed. Please try again.')
  } finally { loading.value = false }
}
</script>

<template>
  <AuthLayout>
    <transition name="fade" mode="out-in">
      <div v-if="!sent" key="form">
        <h1 class="text-2xl font-semibold tracking-tight">{{ t('Create your account') }}</h1>
        <p class="mt-1 text-sm text-night-500 dark:text-night-300">
          {{ t('Just the basics — you can fill in your profile later.') }}
        </p>

        <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
          <Input v-model="fullName" :label="t('Full name')" autocomplete="name" autofocus
                 placeholder="Chan Sokha" :error="err.fullName" required />
          <Input v-model="email" type="email" :label="t('Email')" autocomplete="email"
                 placeholder="you@university.edu" :error="err.email" required />
          <PasswordInput v-model="password" :label="t('Password')" autocomplete="new-password"
                         :hint="t('At least 6 characters')" :error="err.password" required />
          <PasswordInput v-model="password2" :label="t('Confirm password')" autocomplete="new-password"
                         :error="err.password2" required />
          <p v-if="formError" role="alert"
             class="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/25 dark:text-red-200">
            {{ formError }}
          </p>
          <Button type="submit" size="lg" :loading="loading" class="w-full">{{ t('Create account') }}</Button>
        </form>

        <p class="mt-6 text-center text-sm text-night-500 dark:text-night-300">
          {{ t('Already have an account?') }}
          <RouterLink to="/sign-in" class="link">{{ t('Sign in') }}</RouterLink>
        </p>
      </div>

      <div v-else key="sent" class="py-2 text-center">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
          <Icon name="mail" :size="22" />
        </span>
        <h1 class="mt-4 text-xl font-semibold tracking-tight">{{ t('Check your inbox') }}</h1>
        <p class="mt-2 text-sm leading-relaxed text-night-500 dark:text-night-300">
          {{ t('We sent a confirmation link to') }}
          <span class="font-medium text-night-900 dark:text-white">{{ email }}</span>.
          {{ t('Open it to activate your account, then sign in.') }}
        </p>
        <Button variant="secondary" class="mt-6 w-full" @click="router.push('/sign-in')">{{ t('Back to sign in') }}</Button>
      </div>
    </transition>
  </AuthLayout>
</template>
