<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import AuthLayout from './AuthLayout.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const fullName = ref('')
const email = ref('')
const password = ref('')
const password2 = ref('')
const loading = ref(false)
const err = ref<Record<string,string>>({})

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

async function submit() {
  err.value = {}
  if (!fullName.value.trim()) err.value.fullName = 'Enter your full name'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) err.value.email = 'Enter a valid email'
  if (password.value.length < 6) err.value.password = 'Min. 6 characters'
  if (password.value !== password2.value) err.value.password2 = 'Passwords do not match'
  if (Object.keys(err.value).length) return

  loading.value = true
  try {
    const result = await auth.signUp(email.value.trim(), password.value, fullName.value.trim())
    if (!result?.session) {
      toast.success('Check your inbox', 'Confirm your email to finish sign up.')
    } else {
      toast.success('Welcome to Uni Life 🎉')
      router.replace('/')
    }
  } catch (e: any) {
    toast.error('Sign up failed', e?.message ?? 'Please try again')
  } finally { loading.value = false }
}
</script>

<template>
  <AuthLayout>
    <h1 class="text-2xl font-semibold">Create your account</h1>
    <p class="text-sm text-night-500 mt-1">Takes 20 seconds. No credit card required, obviously.</p>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <Input v-model="fullName" label="Full name" autocomplete="name" placeholder="Chan Sokha" :error="err.fullName" required />
      <Input v-model="email" type="email" label="Email" autocomplete="email" placeholder="you@university.edu" :error="err.email" required />
      <Input v-model="password" type="password" label="Password" autocomplete="new-password" placeholder="min. 6 characters" :error="err.password" required />
      <Input v-model="password2" type="password" label="Confirm password" autocomplete="new-password" :error="err.password2" required />
      <Button type="submit" size="lg" :loading="loading" class="w-full">Create account</Button>
    </form>

    <div class="mt-6 text-center text-sm text-night-500">
      Already have an account?
      <RouterLink to="/sign-in" class="link font-medium">Sign in</RouterLink>
    </div>
  </AuthLayout>
</template>
