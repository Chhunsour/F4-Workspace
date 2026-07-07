<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from './AuthLayout.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const p1 = ref(''); const p2 = ref('')
const err = ref<Record<string,string>>({})
const loading = ref(false)
const auth = useAuthStore(); const router = useRouter(); const toast = useToast()

async function submit() {
  err.value = {}
  if (p1.value.length < 6) err.value.p1 = 'Min. 6 characters'
  if (p1.value !== p2.value) err.value.p2 = 'Passwords do not match'
  if (Object.keys(err.value).length) return
  loading.value = true
  try {
    await auth.updatePassword(p1.value)
    toast.success('Password updated')
    router.replace('/')
  } catch (e: any) {
    toast.error('Could not update password', e?.message)
  } finally { loading.value = false }
}
</script>

<template>
  <AuthLayout>
    <h1 class="text-2xl font-semibold">Choose a new password</h1>
    <p class="text-sm text-night-500 mt-1">You're already authenticated via the reset link.</p>
    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <Input v-model="p1" type="password" label="New password" :error="err.p1" required />
      <Input v-model="p2" type="password" label="Confirm password" :error="err.p2" required />
      <Button type="submit" size="lg" :loading="loading" class="w-full">Update password</Button>
    </form>
  </AuthLayout>
</template>
