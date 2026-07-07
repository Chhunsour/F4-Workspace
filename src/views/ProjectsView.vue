<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useProjectsStore } from '@/stores/projects'
import { useSubjectsStore } from '@/stores/subjects'
import { useGroupsStore } from '@/stores/groups'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import ProjectEditor from '@/components/projects/ProjectEditor.vue'
import { fmtDate } from '@/lib/utils'

const projects = useProjectsStore()
const subjects = useSubjectsStore()
const groups = useGroupsStore()
const route = useRoute()
const router = useRouter()

const editorOpen = ref(false)
const editing = ref(null as any)

const { error, loading, load } = useLoad(async () => {
  await Promise.all([projects.fetch(), subjects.fetch(), groups.fetch()])
  if (route.query.new === '1') openNew()
})
watch(() => route.query.new, n => { if (n === '1') openNew() })

function openNew() {
  editing.value = null; editorOpen.value = true
  if (route.query.new) router.replace({ query: { ...route.query, new: undefined } })
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-2xl font-semibold">Projects</h2>
        <p class="text-sm text-night-500">{{ projects.items.length }} total</p>
      </div>
      <Button @click="openNew"><Icon name="plus" :size="16" /> New project</Button>
    </div>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="i in 3" :key="i" height="h-40" rounded="rounded-xl" />
    </div>

    <EmptyState v-else-if="projects.items.length === 0" icon="projects" title="No projects yet"
                body="Start a solo or group project. Track tasks, deadlines, and progress.">
      <Button @click="openNew"><Icon name="plus" :size="16" /> New project</Button>
    </EmptyState>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink v-for="p in projects.items" :key="p.id" :to="`/projects/${p.id}`"
                  class="card p-5 card-hover transition-all">
        <div class="flex items-start gap-3">
          <span class="h-11 w-11 rounded-xl grid place-items-center text-white font-semibold shrink-0" :style="{ background: p.color ?? '#3a68ff' }">
            {{ p.name.slice(0,1).toUpperCase() }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">{{ p.name }}</div>
            <p class="text-xs text-night-500 line-clamp-2">{{ p.description || 'No description' }}</p>
          </div>
        </div>
        <div class="mt-4">
          <div class="flex items-center justify-between text-xs text-night-500 mb-1">
            <span>Progress</span><span>{{ p.progress }}%</span>
          </div>
          <div class="h-1.5 bg-night-100 dark:bg-night-700 rounded-full overflow-hidden">
            <div class="h-full" :style="{ width: p.progress + '%', background: p.color ?? '#3a68ff' }" />
          </div>
        </div>
        <div class="mt-3 flex items-center gap-2 text-xs text-night-500 flex-wrap">
          <span v-if="p.deadline" class="chip"><Icon name="clock" :size="12" /> {{ fmtDate(p.deadline, { month:'short', day:'numeric' }) }}</span>
          <span v-if="subjects.byId(p.subject_id)" class="chip">{{ subjects.byId(p.subject_id)!.name }}</span>
          <span v-if="p.group_id" class="chip"><Icon name="groups" :size="12" /> group</span>
          <span class="chip capitalize">{{ p.status.replace('_',' ') }}</span>
        </div>
      </RouterLink>
    </div>

    <ProjectEditor v-model:open="editorOpen" :editing="editing" />
  </div>
</template>
