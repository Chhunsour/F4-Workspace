<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import AuthLayout from './AuthLayout.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const email = ref('')
const password = ref('')
const loading = ref(false)
const err = ref<Record<string, string>>({})

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

async function submit() {
  err.value = {}
  if (!email.value) err.value.email = 'Enter your email'
  if (!password.value) err.value.password = 'Enter your password'
  if (Object.keys(err.value).length) return
  loading.value = true
  try {
    await auth.signIn(email.value.trim(), password.value)
    toast.success('Welcome back', 'Signed in successfully')
    router.replace((route.query.next as string) || '/')
  } catch (e: any) {
    toast.error('Sign in failed', e?.message ?? 'Please try again')
  } finally { loading.value = false }
}
</script>

<template>
  <AuthLayout>
    <h1 class="text-2xl font-semibold">Welcome back</h1>
    <p class="text-sm text-night-500 mt-1">Sign in to continue your semester.</p>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <Input v-model="email" type="email" label="Email" autocomplete="email" placeholder="you@university.edu" :error="err.email" required />
      <Input v-model="password" type="password" label="Password" autocomplete="current-password" placeholder="••••••••" :error="err.password" required />
      <div class="flex justify-end">
        <RouterLink to="/forgot-password" class="text-xs link">Forgot password?</RouterLink>
      </div>
      <Button type="submit" size="lg" :loading="loading" class="w-full">Sign in</Button>
    </form>

    <div class="mt-6 text-center text-sm text-night-500">
      New here?
      <RouterLink to="/sign-up" class="link font-medium">Create an account</RouterLink>
    </div>
  </AuthLayout>
</template>
