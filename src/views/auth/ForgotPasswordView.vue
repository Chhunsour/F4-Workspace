<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AuthLayout from './AuthLayout.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const auth = useAuthStore()
const toast = useToast()

async function submit() {
  if (!email.value) return
  loading.value = true
  try {
    await auth.requestPasswordReset(email.value.trim())
    sent.value = true
  } catch (e: any) {
    toast.error('Could not send reset link', e?.message)
  } finally { loading.value = false }
}
</script>

<template>
  <AuthLayout>
    <h1 class="text-2xl font-semibold">Reset password</h1>
    <p class="text-sm text-night-500 mt-1">We'll send a reset link to your email.</p>

    <form v-if="!sent" class="mt-6 space-y-4" @submit.prevent="submit">
      <Input v-model="email" type="email" label="Email" autocomplete="email" placeholder="you@university.edu" required />
      <Button type="submit" size="lg" :loading="loading" class="w-full">Send reset link</Button>
    </form>

    <div v-else class="mt-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-100 p-4 text-sm">
      Check <b>{{ email }}</b> for a reset link. It expires in 1 hour.
    </div>

    <div class="mt-6 text-center text-sm text-night-500">
      Remembered it?
      <RouterLink to="/sign-in" class="link font-medium">Back to sign in</RouterLink>
    </div>
  </AuthLayout>
</template>
