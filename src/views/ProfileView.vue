<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import Achievements from '@/components/dashboard/Achievements.vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'

const auth = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const form = reactive({
  full_name: '', university_id: '', major: '', year: null as number | null, bio: '',
})
watch(() => auth.profile, (p) => {
  if (!p) return
  Object.assign(form, {
    full_name: p.full_name ?? '', university_id: p.university_id ?? '',
    major: p.major ?? '', year: p.year, bio: p.bio ?? '',
  })
}, { immediate: true })

const saving = ref(false)
const uploading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

async function save() {
  saving.value = true
  try {
    await auth.updateProfile({
      full_name: form.full_name.trim() || null,
      university_id: form.university_id.trim() || null,
      major: form.major.trim() || null,
      year: form.year ? Number(form.year) : null,
      bio: form.bio.trim() || null,
    })
    toast.success(t('Profile saved'))
  } catch (e: any) { toast.error(t('Could not save'), e?.message) }
  finally { saving.value = false }
}

function pick() { inputRef.value?.click() }
async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
  uploading.value = true
  try {
    await auth.uploadAvatar(file)
    toast.success(t('Avatar updated'))
  } catch (e: any) { toast.error(t('Upload failed'), e?.message) }
  finally { uploading.value = false; if (inputRef.value) inputRef.value.value = '' }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-semibold">{{ t('Profile') }}</h2>
      <p class="text-sm text-night-500">{{ t('Visible to your friends and group members.') }}</p>
    </div>

    <Card padded>
      <div class="flex items-center gap-5">
        <Avatar :src="auth.avatarPublicUrl" :name="auth.displayName" size="xl" />
        <div>
          <input ref="inputRef" type="file" accept="image/*" class="hidden" @change="onFile" />
          <Button variant="secondary" :loading="uploading" @click="pick"><Icon name="camera" :size="16" /> {{ t('Change photo') }}</Button>
          <p class="text-xs text-night-500 mt-2">{{ t('JPG, PNG or WebP. Auto-compressed.') }}</p>
        </div>
      </div>
    </Card>

    <Card>
      <form class="space-y-4" @submit.prevent="save">
        <div class="grid gap-4 sm:grid-cols-2">
          <Input v-model="form.full_name" :label="t('Full name')" required />
          <Input v-model="form.university_id" :label="t('University ID')" placeholder="e.g. STU-22-0011" />
          <Input v-model="form.major" :label="t('Major')" placeholder="e.g. Computer Science" />
          <Input v-model="form.year as any" type="number" min="1" max="7" :label="t('Year')" />
        </div>
        <Textarea v-model="form.bio" :label="t('Short bio')" :rows="3" :placeholder="t('Anything worth sharing')" />
        <div class="flex justify-end">
          <Button type="submit" :loading="saving">{{ t('Save changes') }}</Button>
        </div>
      </form>
    </Card>

    <Achievements />
  </div>
</template>
