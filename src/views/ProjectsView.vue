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
import { useI18n } from '@/composables/useI18n'

const projects = useProjectsStore()
const subjects = useSubjectsStore()
const groups = useGroupsStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

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
        <h2 class="t-page">{{ t('Projects') }}</h2>
        <p class="mt-1 text-sm text-night-600 dark:text-night-200">{{ t('{count} total', { count: projects.items.length }) }}</p>
      </div>
      <Button @click="openNew"><Icon name="plus" :size="16" /> {{ t('New project') }}</Button>
    </div>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="i in 3" :key="i" height="h-40" rounded="rounded-xl" />
    </div>

    <EmptyState v-else-if="projects.items.length === 0" icon="projects" :title="t('No projects yet')"
                :body="t('Start a solo or group project. Track tasks, deadlines, and progress.')">
      <Button @click="openNew"><Icon name="plus" :size="16" /> {{ t('New project') }}</Button>
    </EmptyState>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink v-for="p in projects.items" :key="p.id" :to="`/projects/${p.id}`"
                  class="card card-hover relative overflow-hidden p-5 group">
        <!-- Project-color accent line along the top -->
        <span aria-hidden class="absolute inset-x-0 top-0 h-1" :style="{ background: p.color ?? '#5B7BD4' }" />
        <div class="flex items-start gap-3">
          <span class="h-11 w-11 rounded-xl grid place-items-center text-white font-bold shrink-0 shadow-[0_10px_20px_-8px_rgba(15,20,40,0.35)] group-hover:scale-105 transition-transform"
                :style="{ background: p.color ?? '#5B7BD4' }">
            {{ p.name.slice(0,1).toUpperCase() }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-[15px] font-bold truncate text-night-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">{{ p.name }}</div>
            <p class="text-xs text-night-600 dark:text-night-200 line-clamp-2 mt-0.5">{{ p.description || t('No description') }}</p>
          </div>
        </div>
        <div class="mt-4">
          <div class="flex items-center justify-between text-xs text-night-600 dark:text-night-200 mb-1.5">
            <span class="font-semibold t-section">{{ t('Progress') }}</span>
            <span class="tabular-nums font-bold text-night-900 dark:text-white">{{ p.progress }}%</span>
          </div>
          <div class="h-1.5 bg-night-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div class="h-full transition-[width] duration-500 ease-smooth"
                 :style="{ width: p.progress + '%', background: p.color ?? '#5B7BD4', boxShadow: `0 0 8px ${p.color ?? '#5B7BD4'}` }" />
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1.5 flex-wrap">
          <span v-if="p.deadline" class="chip"><Icon name="clock" :size="12" /> {{ fmtDate(p.deadline, { month:'short', day:'numeric' }) }}</span>
          <span v-if="subjects.byId(p.subject_id)" class="chip">{{ subjects.byId(p.subject_id)!.name }}</span>
          <span v-if="p.group_id" class="chip"><Icon name="groups" :size="12" /> {{ t('group') }}</span>
          <span v-if="p.status === 'active'" class="chip-brand capitalize">{{ t(p.status.replace('_',' ')) }}</span>
          <span v-else-if="p.status === 'completed'" class="chip-success capitalize">{{ t(p.status.replace('_',' ')) }}</span>
          <span v-else class="chip capitalize">{{ t(p.status.replace('_',' ')) }}</span>
        </div>
      </RouterLink>
    </div>

    <ProjectEditor v-model:open="editorOpen" :editing="editing" />
  </div>
</template>
