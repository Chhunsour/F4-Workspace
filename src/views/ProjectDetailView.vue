<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useProjectsStore } from '@/stores/projects'
import { useSubjectsStore } from '@/stores/subjects'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Badge from '@/components/ui/Badge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ProjectEditor from '@/components/projects/ProjectEditor.vue'
import TaskEditor from '@/components/projects/TaskEditor.vue'
import TaskCard from '@/components/projects/TaskCard.vue'
import MemberInviter from '@/components/projects/MemberInviter.vue'
import CommentThread from '@/components/shared/CommentThread.vue'
import { fmtDate, humanCountdown } from '@/lib/utils'
import { useNow } from '@/composables/useCountdown'
import type { ProjectTask } from '@/types'

const route = useRoute()
const store = useProjectsStore()
const subjects = useSubjectsStore()
const auth = useAuthStore()
const now = useNow()
const toast = useToast()
const confirmDialog = useConfirm()

const isOwner = computed(() => store.detail?.project.owner_id === auth.userId)

function memberName(id: string | null): string | null {
  if (!id) return null
  return store.detail?.members.find(m => m.user_id === id)?.profile?.full_name ?? null
}

async function removeMember(uid: string) {
  const ok = await confirmDialog.ask({ title: 'Remove member?', body: 'They lose access to this project.', destructive: true, confirmLabel: 'Remove' })
  if (!ok) return
  try {
    await store.removeMember(projectId.value, uid)
    toast.success('Member removed')
  } catch (e: any) { toast.error('Could not remove member', e?.message) }
}

const editingProject = ref(false)
const editingTask = ref<ProjectTask | null>(null)
const taskEditorOpen = ref(false)
const newTaskColumn = ref<ProjectTask['status'] | undefined>()

const projectId = computed(() => String(route.params.id))

const { error, load } = useLoad(() => Promise.all([subjects.fetch(), store.loadDetail(projectId.value)]))
watch(projectId, (id) => { if (id) load() })

// Simple board: To Do / Doing / Done. Old 'review' tasks show under Doing.
const columns = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'Doing' },
  { key: 'completed', label: 'Done' },
] as const

// Who's doing what, right now — from live task state.
const todayLines = computed(() => {
  const out: { text: string; task: ProjectTask }[] = []
  const todayIso = new Date().toLocaleDateString('sv')
  for (const t of store.detail?.tasks ?? []) {
    const who = memberName(t.assignee_id)
    if (t.status === 'in_progress' || t.status === 'review')
      out.push({ text: `${who ?? 'Someone'} is working on ${t.title}`, task: t })
    else if (t.status === 'completed' && t.updated_at.slice(0, 10) === todayIso)
      out.push({ text: `${who ?? 'Someone'} finished ${t.title}`, task: t })
  }
  return out.slice(0, 5)
})

function tasksIn(col: string) {
  return store.detail?.tasks
    .filter(t => (t.status === 'review' ? 'in_progress' : t.status) === col)
    .sort((a,b) => a.position - b.position) ?? []
}
function openNewTask(col: ProjectTask['status']) {
  editingTask.value = null; newTaskColumn.value = col; taskEditorOpen.value = true
}
function openEditTask(t: ProjectTask) { editingTask.value = t; taskEditorOpen.value = true }
function moveTask(t: ProjectTask, next: ProjectTask['status']) { store.updateTask(t.id, { status: next }) }
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <RouterLink to="/projects" class="text-xs font-medium text-night-600 dark:text-night-200 hover:text-brand-600 dark:hover:text-brand-300 inline-flex items-center gap-1 transition-colors">
      <Icon name="chevron_left" :size="14" /> Projects
    </RouterLink>

    <LoadError v-if="error" :message="error" @retry="load" />

    <LoadingSpinner v-else-if="store.detailLoading" label="Loading project…" />

    <template v-else-if="store.detail">
      <!-- Hero header with project color accent + progress bar -->
      <div class="hero-surface p-5 sm:p-6">
        <span aria-hidden class="absolute left-0 top-0 h-full w-1" :style="{ background: store.detail.project.color ?? '#5B7BD4' }" />
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="flex items-start gap-3">
            <span class="h-14 w-14 rounded-2xl grid place-items-center text-white font-bold text-xl shrink-0 shadow-[0_12px_28px_-10px_rgba(15,20,40,0.4)]"
                  :style="{ background: store.detail.project.color ?? '#5B7BD4' }">
              {{ store.detail.project.name.slice(0,1).toUpperCase() }}
            </span>
            <div>
              <h2 class="t-page">{{ store.detail.project.name }}</h2>
              <p class="mt-1 text-sm text-night-600 dark:text-night-100 max-w-2xl">{{ store.detail.project.description || 'No description' }}</p>
              <div class="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge v-if="subjects.byId(store.detail.project.subject_id)"
                       :dot="subjects.byId(store.detail.project.subject_id)!.color">
                  {{ subjects.byId(store.detail.project.subject_id)!.name }}
                </Badge>
                <span v-if="store.detail.project.deadline" class="chip-brand">
                  <Icon name="clock" :size="12" />
                  Due {{ fmtDate(store.detail.project.deadline!) }} · {{ humanCountdown(new Date(store.detail.project.deadline!), now) }} left
                </span>
                <Badge>{{ store.detail.members.length }} member{{ store.detail.members.length === 1 ? '' : 's' }}</Badge>
              </div>
            </div>
          </div>
          <Button variant="secondary" @click="editingProject = true"><Icon name="edit" :size="16" /> Edit</Button>
        </div>

        <!-- Member avatar stack + progress bar -->
        <div class="mt-5 flex items-center gap-4 flex-wrap">
          <div class="flex -space-x-2">
            <Avatar v-for="(m, i) in store.detail.members.slice(0, 6)" :key="m.user_id" :name="m.profile?.full_name" size="sm"
                    class="ring-2 ring-white dark:ring-[var(--surface-secondary)]"
                    :style="{ zIndex: 10 - i }" />
            <span v-if="store.detail.members.length > 6"
                  class="grid h-8 w-8 place-items-center rounded-full ring-2 ring-white dark:ring-[var(--surface-secondary)] bg-brand-500/15 text-brand-700 dark:text-brand-200 text-[11px] font-bold">
              +{{ store.detail.members.length - 6 }}
            </span>
          </div>
          <div class="flex-1 min-w-[220px]">
            <div class="mb-1.5 flex items-center justify-between text-xs">
              <span class="t-section">Project progress</span>
              <span class="tabular-nums font-bold text-night-900 dark:text-white">{{ store.detail.project.progress }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-night-100 dark:bg-white/[0.06]">
              <div class="h-full transition-[width] duration-500"
                   :style="{ width: store.detail.project.progress + '%', background: store.detail.project.color ?? '#5B7BD4', boxShadow: `0 0 10px ${store.detail.project.color ?? '#5B7BD4'}` }" />
            </div>
          </div>
        </div>
      </div>

      <!-- today: who's doing what -->
      <section v-if="todayLines.length">
        <h4 class="t-section mb-2 flex items-center gap-2">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-brand-500 animate-livePulse" />
          Today
        </h4>
        <ul class="space-y-1">
          <li v-for="(l, i) in todayLines" :key="i">
            <button type="button"
                    class="group -mx-2 flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-brand-500/6 dark:hover:bg-brand-400/10"
                    @click="openEditTask(l.task)">
              <span class="h-2 w-2 shrink-0 rounded-full"
                    :class="l.task.status === 'completed' ? 'bg-grass-500' : 'bg-brand-500 shadow-[0_0_8px_rgba(91,123,212,0.6)]'" />
              <span class="min-w-0 flex-1 truncate text-night-800 dark:text-night-100 group-hover:text-night-900 dark:group-hover:text-white transition-colors">{{ l.text }}</span>
            </button>
          </li>
        </ul>
      </section>

      <!-- board -->
      <div class="grid gap-3 md:grid-cols-3">
        <div v-for="col in columns" :key="col.key"
             class="compact p-3">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-bold text-night-900 dark:text-white">{{ col.label }}</h4>
              <span :class="col.key === 'in_progress' ? 'chip-brand' : col.key === 'completed' ? 'chip-success' : 'chip'">{{ tasksIn(col.key).length }}</span>
            </div>
            <button class="grid h-7 w-7 place-items-center rounded-lg text-night-500 hover:text-brand-600 hover:bg-brand-500/10 transition-colors" @click="openNewTask(col.key)" aria-label="Add task">
              <Icon name="plus" :size="16" />
            </button>
          </div>
          <div class="space-y-2 min-h-[3rem]">
            <TaskCard v-for="t in tasksIn(col.key)" :key="t.id" :task="t"
                      :assignee-name="memberName(t.assignee_id)"
                      @edit="openEditTask" @move="(task, next) => moveTask(task, next)" />
            <button v-if="!tasksIn(col.key).length"
                    class="w-full text-xs text-night-500 dark:text-night-300 italic py-6 rounded-xl border-2 border-dashed border-[var(--card-border-strong)] hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                    @click="openNewTask(col.key)">+ add task</button>
          </div>
        </div>
      </div>

      <!-- members + comments -->
      <div class="grid gap-6 lg:grid-cols-2">
        <Card>
          <h4 class="font-semibold mb-3">Members</h4>
          <ul class="space-y-2 mb-3">
            <li v-for="m in store.detail.members" :key="m.user_id" class="flex items-center gap-2 text-sm">
              <Avatar :name="m.profile?.full_name" size="sm" />
              <span class="flex-1 truncate">{{ m.profile?.full_name ?? m.user_id.slice(0,6) }}</span>
              <span class="chip capitalize">{{ m.role }}</span>
              <button v-if="isOwner && m.user_id !== auth.userId"
                      class="grid h-8 w-8 place-items-center rounded-lg text-night-400 hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      aria-label="Remove member" @click="removeMember(m.user_id)">
                <Icon name="trash" :size="14" />
              </button>
            </li>
          </ul>
          <!-- Only the owner's invites succeed under RLS — don't show a control that errors for everyone else -->
          <MemberInviter v-if="isOwner" :project-id="store.detail.project.id" />
        </Card>
        <Card>
          <h4 class="font-semibold mb-3">Activity</h4>
          <CommentThread target-type="project" :target-id="store.detail.project.id" />
        </Card>
      </div>

      <ProjectEditor v-model:open="editingProject" :editing="store.detail.project" />
      <TaskEditor v-model:open="taskEditorOpen" :project-id="store.detail.project.id" :editing="editingTask" :default-status="newTaskColumn" />
    </template>

    <EmptyState v-else icon="search" title="Project not found" body="It may have been deleted." />
  </div>
</template>
