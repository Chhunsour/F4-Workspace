<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useGroupsStore } from '@/stores/groups'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'

const store = useGroupsStore()
const toast = useToast()
const { t } = useI18n()

const createOpen = ref(false)
const joinOpen = ref(false)
const cName = ref('')
const cDesc = ref('')
const joinCode = ref('')
const busy = ref(false)

const { error, loading, load } = useLoad(() => store.fetch())

async function submitCreate() {
  if (!cName.value.trim()) return
  busy.value = true
  try {
    await store.create(cName.value.trim(), cDesc.value || undefined)
    toast.success(t('Group created'))
    cName.value = ''; cDesc.value = ''
    createOpen.value = false
  } catch (e: any) { toast.error(t('Could not create group'), e?.message) }
  finally { busy.value = false }
}
async function submitJoin() {
  if (!joinCode.value.trim()) return
  busy.value = true
  try {
    const g = await store.joinByCode(joinCode.value.trim())
    toast.success(t('Joined {name}', { name: g.name }))
    joinOpen.value = false; joinCode.value = ''
  } catch (e: any) { toast.error(t('Could not join'), e?.message) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-2xl font-semibold">{{ t('Groups') }}</h2>
        <p class="text-sm text-night-500">{{ t('Study crews, project teams, close friends.') }}</p>
      </div>
      <div class="flex gap-2">
        <Button variant="secondary" @click="joinOpen = true">{{ t('Join by code') }}</Button>
        <Button @click="createOpen = true"><Icon name="plus" :size="16" /> {{ t('New group') }}</Button>
      </div>
    </div>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="i in 3" :key="i" height="h-28" rounded="rounded-xl" />
    </div>

    <EmptyState v-else-if="store.items.length === 0" icon="groups" :title="t('No groups yet')"
                :body="t('Create one and share the code with your friends.')">
      <div class="flex gap-2 mt-2">
        <Button variant="secondary" @click="joinOpen = true">{{ t('Join') }}</Button>
        <Button @click="createOpen = true">{{ t('Create') }}</Button>
      </div>
    </EmptyState>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink v-for="g in store.items" :key="g.id" :to="`/groups/${g.id}`" class="card p-5 card-hover">
        <div class="flex items-center gap-3">
          <div class="h-12 w-12 rounded-xl bg-brand-600 text-white grid place-items-center font-semibold text-lg shrink-0">
            {{ g.name.slice(0,1).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="t-card truncate">{{ g.name }}</div>
            <div class="text-xs text-night-500 dark:text-night-300 truncate">{{ g.description || t('No description') }}</div>
          </div>
        </div>
      </RouterLink>
    </div>

    <Modal v-model:open="createOpen" :title="t('Create group')">
      <div class="space-y-3">
        <Input v-model="cName" :label="t('Group name')" placeholder="e.g. Batch 22 Evening" required />
        <Textarea v-model="cDesc" :label="t('Description')" :rows="2" :placeholder="t('Optional')" />
      </div>
      <template #footer>
        <Button variant="ghost" size="sm" @click="createOpen = false">{{ t('Cancel') }}</Button>
        <Button size="sm" :loading="busy" @click="submitCreate">{{ t('Create') }}</Button>
      </template>
    </Modal>

    <Modal v-model:open="joinOpen" :title="t('Join a group')">
      <div class="space-y-3">
        <Input v-model="joinCode" :label="t('Join code')" :placeholder="t('8-character code')" />
        <p class="text-xs text-night-500">{{ t("Ask a group owner for the code. It's shown on their group page.") }}</p>
      </div>
      <template #footer>
        <Button variant="ghost" size="sm" @click="joinOpen = false">{{ t('Cancel') }}</Button>
        <Button size="sm" :loading="busy" @click="submitJoin">{{ t('Join') }}</Button>
      </template>
    </Modal>
  </div>
</template>
