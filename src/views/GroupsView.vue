<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useGroupsStore } from '@/stores/groups'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useToast } from '@/composables/useToast'

const store = useGroupsStore()
const toast = useToast()

const createOpen = ref(false)
const joinOpen = ref(false)
const cName = ref('')
const cDesc = ref('')
const joinCode = ref('')
const busy = ref(false)

onMounted(() => store.fetch())

async function submitCreate() {
  if (!cName.value.trim()) return
  busy.value = true
  try {
    await store.create(cName.value.trim(), cDesc.value || undefined)
    toast.success('Group created')
    cName.value = ''; cDesc.value = ''
    createOpen.value = false
  } catch (e: any) { toast.error('Could not create group', e?.message) }
  finally { busy.value = false }
}
async function submitJoin() {
  if (!joinCode.value.trim()) return
  busy.value = true
  try {
    const g = await store.joinByCode(joinCode.value.trim())
    toast.success(`Joined ${g.name}`)
    joinOpen.value = false; joinCode.value = ''
  } catch (e: any) { toast.error('Could not join', e?.message) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-2xl font-semibold">Groups</h2>
        <p class="text-sm text-night-500">Study crews, project teams, close friends.</p>
      </div>
      <div class="flex gap-2">
        <Button variant="secondary" @click="joinOpen = true">Join by code</Button>
        <Button @click="createOpen = true"><Icon name="plus" :size="16" /> New group</Button>
      </div>
    </div>

    <EmptyState v-if="store.items.length === 0" icon="groups" title="No groups yet"
                body="Create one and share the code with your friends.">
      <div class="flex gap-2 mt-2">
        <Button variant="secondary" @click="joinOpen = true">Join</Button>
        <Button @click="createOpen = true">Create</Button>
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
            <div class="text-xs text-night-500 dark:text-night-300 truncate">{{ g.description || 'No description' }}</div>
          </div>
        </div>
        <div class="mt-3 text-xs text-night-500 dark:text-night-300">
          Join code · <span class="font-mono font-semibold text-night-700 dark:text-night-100">{{ g.join_code }}</span>
        </div>
      </RouterLink>
    </div>

    <Modal v-model:open="createOpen" title="Create group">
      <div class="space-y-3">
        <Input v-model="cName" label="Group name" placeholder="e.g. Batch 22 Evening" required />
        <Textarea v-model="cDesc" label="Description" :rows="2" placeholder="Optional" />
      </div>
      <template #footer>
        <Button variant="ghost" size="sm" @click="createOpen = false">Cancel</Button>
        <Button size="sm" :loading="busy" @click="submitCreate">Create</Button>
      </template>
    </Modal>

    <Modal v-model:open="joinOpen" title="Join a group">
      <div class="space-y-3">
        <Input v-model="joinCode" label="Join code" placeholder="8-character code" />
        <p class="text-xs text-night-500">Ask a group owner for the code. It's shown on their group page.</p>
      </div>
      <template #footer>
        <Button variant="ghost" size="sm" @click="joinOpen = false">Cancel</Button>
        <Button size="sm" :loading="busy" @click="submitJoin">Join</Button>
      </template>
    </Modal>
  </div>
</template>
