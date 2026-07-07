import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectTask, ProjectMember } from '@/types'

interface DetailBundle {
  project: Project
  tasks: ProjectTask[]
  members: (ProjectMember & { profile?: { full_name: string | null; avatar_url: string | null } | null })[]
}

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    items: [] as Project[],
    loaded: false,
    loading: false,
    detail: null as DetailBundle | null,
    detailLoading: false,
  }),
  getters: {
    upcomingDeadlines(state) {
      const today = new Date(); today.setHours(0,0,0,0)
      return state.items
        .filter(p => p.deadline && p.status !== 'completed' && p.status !== 'archived')
        .sort((a,b) => (a.deadline! ).localeCompare(b.deadline!))
    },
  },
  actions: {
    async fetch(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      this.loading = false
      if (error) throw error
      this.items = (data ?? []) as Project[]
      this.loaded = true
    },
    async create(patch: Partial<Project> & { name: string }) {
      const { data: sess } = await supabase.auth.getSession()
      const owner_id = sess.session?.user.id
      if (!owner_id) throw new Error('Not signed in')
      const { data, error } = await supabase.from('projects').insert({ owner_id, ...patch }).select().single()
      if (error) throw error
      const project = data as Project
      // add owner as project_member
      await supabase.from('project_members').insert({ project_id: project.id, user_id: owner_id, role: 'owner' })
      this.items.unshift(project)
      return project
    },
    async update(id: string, patch: Partial<Project>) {
      const { data, error } = await supabase.from('projects').update(patch).eq('id', id).select().single()
      if (error) throw error
      const project = data as Project
      const i = this.items.findIndex(x => x.id === id); if (i !== -1) this.items[i] = project
      if (this.detail?.project.id === id) this.detail.project = project
      return project
    },
    async remove(id: string) {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      this.items = this.items.filter(x => x.id !== id)
      if (this.detail?.project.id === id) this.detail = null
    },

    async loadDetail(id: string) {
      this.detailLoading = true
      try {
        const [pj, tk, mm] = await Promise.all([
          supabase.from('projects').select('*').eq('id', id).single(),
          supabase.from('project_tasks').select('*').eq('project_id', id).order('position'),
          supabase.from('project_members').select('*, profile:profiles(full_name, avatar_url)').eq('project_id', id),
        ])
        if (pj.error) throw pj.error
        if (tk.error) throw tk.error
        if (mm.error) throw mm.error
        this.detail = {
          project: pj.data as Project,
          tasks: (tk.data ?? []) as ProjectTask[],
          members: (mm.data ?? []) as any,
        }
      } finally { this.detailLoading = false }
    },

    async addTask(project_id: string, patch: Partial<ProjectTask> & { title: string }) {
      const { data: sess } = await supabase.auth.getSession()
      const owner_id = sess.session?.user.id!
      const status = patch.status ?? 'todo'
      const position = (this.detail?.tasks.filter(t => t.status === status).length ?? 0)
      const { data, error } = await supabase.from('project_tasks').insert({
        project_id, owner_id, status, position, ...patch,
      }).select().single()
      if (error) throw error
      const task = data as ProjectTask
      this.detail?.tasks.push(task)
      await this.recalcProgress(project_id)
      return task
    },
    async updateTask(id: string, patch: Partial<ProjectTask>) {
      const { data, error } = await supabase.from('project_tasks').update(patch).eq('id', id).select().single()
      if (error) throw error
      const task = data as ProjectTask
      if (this.detail) {
        const i = this.detail.tasks.findIndex(t => t.id === id)
        if (i !== -1) this.detail.tasks[i] = task
      }
      await this.recalcProgress(task.project_id)
      return task
    },
    async removeTask(id: string) {
      const t = this.detail?.tasks.find(x => x.id === id); if (!t) return
      const { error } = await supabase.from('project_tasks').delete().eq('id', id)
      if (error) throw error
      if (this.detail) this.detail.tasks = this.detail.tasks.filter(x => x.id !== id)
      await this.recalcProgress(t.project_id)
    },

    async recalcProgress(project_id: string) {
      if (!this.detail || this.detail.project.id !== project_id) return
      const total = this.detail.tasks.length
      const done = this.detail.tasks.filter(t => t.status === 'completed').length
      const progress = total ? Math.round(done / total * 100) : 0
      if (progress !== this.detail.project.progress) {
        await this.update(project_id, { progress })
      }
    },
  },
})
