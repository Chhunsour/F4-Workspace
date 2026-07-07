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
import { STATUS_LABELS } from '@/types'
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

const columns = [
  { key: 'todo', label: STATUS_LABELS.todo.label },
  { key: 'in_progress', label: STATUS_LABELS.in_progress.label },
  { key: 'review', label: STATUS_LABELS.review.label },
  { key: 'completed', label: STATUS_LABELS.completed.label },
] as const

function tasksIn(col: string) {
  return store.detail?.tasks.filter(t => t.status === col).sort((a,b) => a.position - b.position) ?? []
}
function openNewTask(col: ProjectTask['status']) {
  editingTask.value = null; newTaskColumn.value = col; taskEditorOpen.value = true
}
function openEditTask(t: ProjectTask) { editingTask.value = t; taskEditorOpen.value = true }
function moveTask(t: ProjectTask, next: ProjectTask['status']) { store.updateTask(t.id, { status: next }) }
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <RouterLink to="/projects" class="text-xs text-night-500 hover:text-brand-600 inline-flex items-center gap-1">
      <Icon name="chevron_left" :size="14" /> Projects
    </RouterLink>

    <LoadError v-if="error" :message="error" @retry="load" />

    <LoadingSpinner v-else-if="store.detailLoading" label="Loading project…" />

    <template v-else-if="store.detail">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="flex items-start gap-3">
          <span class="h-12 w-12 rounded-2xl grid place-items-center text-white font-semibold text-lg shrink-0"
                :style="{ background: store.detail.project.color ?? '#3a68ff' }">
            {{ store.detail.project.name.slice(0,1).toUpperCase() }}
          </span>
          <div>
            <h2 class="text-2xl font-semibold">{{ store.detail.project.name }}</h2>
            <p class="text-sm text-night-500 max-w-2xl">{{ store.detail.project.description || 'No description' }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge v-if="subjects.byId(store.detail.project.subject_id)"
                     :dot="subjects.byId(store.detail.project.subject_id)!.color">
                {{ subjects.byId(store.detail.project.subject_id)!.name }}
              </Badge>
              <Badge v-if="store.detail.project.deadline">
                <Icon name="clock" :size="12" />
                {{ fmtDate(store.detail.project.deadline!) }} · {{ humanCountdown(new Date(store.detail.project.deadline!), now) }} left
              </Badge>
              <Badge class="capitalize">{{ store.detail.project.status.replace('_',' ') }}</Badge>
            </div>
          </div>
        </div>
        <Button variant="secondary" @click="editingProject = true"><Icon name="edit" :size="16" /> Edit</Button>
      </div>

      <!-- progress -->
      <Card padded>
        <div class="flex items-center justify-between text-sm mb-1.5">
          <span class="font-medium">Overall progress</span>
          <span>{{ store.detail.project.progress }}%</span>
        </div>
        <div class="h-2 bg-night-100 dark:bg-night-700 rounded-full overflow-hidden">
          <div class="h-full transition-all" :style="{ width: store.detail.project.progress + '%', background: store.detail.project.color ?? '#3a68ff' }" />
        </div>
      </Card>

      <!-- board -->
      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div v-for="col in columns" :key="col.key"
             class="rounded-2xl bg-white dark:bg-night-800 border border-surface-border dark:border-night-700 p-3">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-semibold">{{ col.label }}</h4>
              <span class="chip">{{ tasksIn(col.key).length }}</span>
            </div>
            <button class="text-night-500 hover:text-night-900 dark:hover:text-white" @click="openNewTask(col.key)" aria-label="Add task">
              <Icon name="plus" :size="16" />
            </button>
          </div>
          <div class="space-y-2 min-h-[3rem]">
            <TaskCard v-for="t in tasksIn(col.key)" :key="t.id" :task="t"
                      :assignee-name="memberName(t.assignee_id)"
                      @edit="openEditTask" @move="(task, next) => moveTask(task, next)" />
            <button v-if="!tasksIn(col.key).length" class="w-full text-xs text-night-400 italic py-6 rounded-xl border-2 border-dashed border-surface-border dark:border-night-700 hover:border-brand-400"
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
