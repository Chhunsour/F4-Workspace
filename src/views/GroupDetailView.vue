<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useGroupsStore } from '@/stores/groups'
import { useProjectsStore } from '@/stores/projects'
import { useMemoriesStore } from '@/stores/memories'
import { useAuthStore } from '@/stores/auth'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Avatar from '@/components/ui/Avatar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import Icon from '@/components/ui/Icon.vue'
import { fmtDate } from '@/lib/utils'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const route = useRoute(); const router = useRouter()
const groups = useGroupsStore()
const projects = useProjectsStore()
const mem = useMemoriesStore()
const auth = useAuthStore()
const toast = useToast(); const confirm = useConfirm()

const groupId = computed(() => String(route.params.id))
const codeCopied = ref(false)

const { error, load } = useLoad(() =>
  Promise.all([groups.loadDetail(groupId.value), projects.fetch(), mem.fetch()]))
watch(groupId, id => { if (id) load() })

const sharedProjects = computed(() => projects.items.filter(p => p.group_id === groupId.value))
const sharedMemories = computed(() => mem.items.filter(m => m.group_id === groupId.value))

// What's been happening — built from data this page already loads.
const activity = computed(() => {
  const out: { text: string; when: string; to: string }[] = []
  for (const m of sharedMemories.value) {
    const who = m.owner_id === auth.userId ? 'You' : 'A friend'
    out.push({ text: `${who} added "${m.title || 'a memory'}"`, when: m.created_at, to: `/memories/${m.id}` })
  }
  for (const p of sharedProjects.value) {
    if (p.status === 'completed') out.push({ text: `${p.name} was finished`, when: p.updated_at, to: `/projects/${p.id}` })
    else if (p.progress > 0) out.push({ text: `${p.name} is ${p.progress}% done`, when: p.updated_at, to: `/projects/${p.id}` })
  }
  for (const mb of groups.detail?.members ?? []) {
    if (mb.user_id !== groups.detail?.group.owner_id)
      out.push({ text: `${mb.profile?.full_name ?? 'Someone'} joined the group`, when: mb.joined_at, to: '#members' })
  }
  return out.sort((a, b) => b.when.localeCompare(a.when)).slice(0, 6)
})

async function copyCode() {
  if (!groups.detail) return
  await navigator.clipboard.writeText(groups.detail.group.join_code)
  codeCopied.value = true
  setTimeout(() => codeCopied.value = false, 1500)
}

async function leave() {
  if (!groups.detail) return
  const ok = await confirm.ask({ title: 'Leave group?', body: 'You can rejoin using the code later.', confirmLabel: 'Leave', destructive: true })
  if (!ok) return
  await groups.leave(groupId.value)
  toast.info('You left the group')
  router.push('/groups')
}
async function deleteGroup() {
  if (!groups.detail) return
  const ok = await confirm.ask({ title: 'Delete group?', body: 'This permanently removes it for all members.', confirmLabel: 'Delete', destructive: true })
  if (!ok) return
  await groups.remove(groupId.value)
  toast.success('Group deleted')
  router.push('/groups')
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-4">
    <RouterLink to="/groups" class="text-xs text-night-500 hover:text-brand-600 inline-flex items-center gap-1"><Icon name="chevron_left" :size="14" /> Groups</RouterLink>
    <LoadError v-if="error" :message="error" @retry="load" />
    <LoadingSpinner v-else-if="groups.detailLoading" label="Loading group…" />
    <template v-else-if="groups.detail">
      <div class="flex items-start gap-3">
        <div class="h-14 w-14 rounded-xl bg-brand-600 text-white grid place-items-center font-semibold text-2xl shrink-0">
          {{ groups.detail.group.name.slice(0,1).toUpperCase() }}
        </div>
        <div class="min-w-0">
          <h2 class="t-page !text-2xl">{{ groups.detail.group.name }}</h2>
          <p class="mt-0.5 text-sm text-night-500 dark:text-night-300 max-w-2xl">{{ groups.detail.group.description || 'No description' }}</p>
          <div class="mt-2.5 flex items-center gap-2">
            <div class="flex -space-x-2">
              <Avatar v-for="m in groups.detail.members.slice(0, 6)" :key="m.user_id"
                      :name="m.profile?.full_name" size="sm"
                      class="ring-2 ring-white dark:ring-night-800" :title="m.profile?.full_name ?? ''" />
            </div>
            <span class="text-xs text-night-500 dark:text-night-300">
              {{ groups.detail.members.length }} member{{ groups.detail.members.length === 1 ? '' : 's' }}
            </span>
          </div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <Card v-if="activity.length" class="lg:col-span-3">
          <h4 class="font-semibold mb-3">What's been happening</h4>
          <ul class="space-y-1">
            <li v-for="(a, i) in activity" :key="i">
              <component :is="a.to === '#members' ? 'div' : 'router-link'" :to="a.to === '#members' ? undefined : a.to"
                         class="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors"
                         :class="a.to !== '#members' && 'hover:bg-black/5 dark:hover:bg-white/5'">
                <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <span class="min-w-0 flex-1 truncate text-night-700 dark:text-night-100">{{ a.text }}</span>
                <span class="shrink-0 text-[11px] text-night-400">{{ fmtDate(a.when, { month:'short', day:'numeric' }) }}</span>
              </component>
            </li>
          </ul>
        </Card>

        <Card class="lg:col-span-2">
          <h4 class="font-semibold mb-3">Shared projects</h4>
          <EmptyState v-if="sharedProjects.length === 0" icon="projects" title="No shared projects yet"
                      body="When you create a project and set this group, it shows up here.">
            <RouterLink to="/projects?new=1" class="link">Start one →</RouterLink>
          </EmptyState>
          <ul v-else class="space-y-2">
            <li v-for="p in sharedProjects" :key="p.id">
              <RouterLink :to="`/projects/${p.id}`" class="flex items-center gap-3 rounded-xl border border-surface-border dark:border-night-700 p-3 hover:bg-night-50 dark:hover:bg-night-800">
                <span class="h-9 w-9 rounded-xl grid place-items-center text-white font-semibold" :style="{ background: p.color ?? '#3a68ff' }">{{ p.name.slice(0,1).toUpperCase() }}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">{{ p.name }}</div>
                  <div class="text-xs text-night-500 truncate">{{ p.progress }}% · {{ p.status.replace('_',' ') }}</div>
                </div>
              </RouterLink>
            </li>
          </ul>
        </Card>

        <Card>
          <h4 class="font-semibold mb-3">Members</h4>
          <ul class="space-y-2">
            <li v-for="m in groups.detail.members" :key="m.user_id" class="flex items-center gap-2">
              <Avatar :name="m.profile?.full_name" size="sm" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{{ m.profile?.full_name ?? m.user_id.slice(0,6) }}</div>
                <div class="text-[11px] text-night-500 truncate">{{ m.profile?.major ?? '' }} <span v-if="m.profile?.year">· Year {{ m.profile.year }}</span></div>
              </div>
              <span class="chip capitalize">{{ m.role }}</span>
            </li>
          </ul>
        </Card>

        <Card class="lg:col-span-3">
          <h4 class="font-semibold mb-3">Shared memories</h4>
          <EmptyState v-if="sharedMemories.length === 0" icon="camera" title="No shared memories yet"
                      body="Set a memory's group to this one when creating it." />
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <RouterLink v-for="m in sharedMemories.slice(0,10)" :key="m.id" :to="`/memories/${m.id}`"
                        class="aspect-square rounded-xl overflow-hidden bg-night-100 dark:bg-night-800 relative">
              <img v-if="mem.thumbnailUrl(m.id)" :src="mem.thumbnailUrl(m.id)!" loading="lazy" decoding="async" class="absolute inset-0 h-full w-full object-cover" alt="" />
            </RouterLink>
          </div>
        </Card>
      </div>

      <!-- group settings: useful, but not the point of the page -->
      <div class="flex flex-wrap items-center gap-2 border-t border-surface-border pt-4 dark:border-night-700">
        <span class="text-xs text-night-500 dark:text-night-300">Invite friends with this code:</span>
        <button class="chip" @click="copyCode">
          <span class="font-mono font-semibold">{{ groups.detail.group.join_code }}</span>
          <span v-if="codeCopied" class="text-emerald-600">copied</span>
          <span v-else class="text-night-400">tap to copy</span>
        </button>
        <div class="flex-1" />
        <Button v-if="groups.detail.group.owner_id === auth.userId" variant="ghost" size="sm"
                class="!text-red-500" @click="deleteGroup">Delete group</Button>
        <Button v-else variant="ghost" size="sm" @click="leave">Leave group</Button>
      </div>
    </template>
    <EmptyState v-else icon="search" title="Group not found" body="It may have been deleted." />
  </div>
</template>
