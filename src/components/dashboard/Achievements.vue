<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStudyStore } from '@/stores/study'
import { useAssignmentsStore } from '@/stores/assignments'
import { useMemoriesStore } from '@/stores/memories'
import { useProjectsStore } from '@/stores/projects'
import Card from '@/components/ui/Card.vue'
import Icon from '@/components/ui/Icon.vue'

const study = useStudyStore()
const assignments = useAssignmentsStore()
const memories = useMemoriesStore()
const projects = useProjectsStore()

onMounted(() => Promise.allSettled([study.fetch(), assignments.fetch(), memories.fetch(), projects.fetch()]))

interface Badge { icon: string; title: string; desc: string; earned: boolean; progress?: string }
// icon = name from the app icon set (no emoji — keeps badges consistent with the rest of the UI)

const badges = computed<Badge[]>(() => {
  const completed = assignments.items.filter(a => a.status === 'completed').length
  const memCount = memories.items.length
  const projCount = projects.items.filter(p => p.status === 'completed').length
  const streak = study.streakDays
  const weekMin = Math.round(study.totalThisWeek / 60)
  return [
    { icon: 'fire',        title: 'Warm-up',           desc: '2 study days in a row',    earned: streak >= 2,     progress: `${Math.min(streak,2)}/2` },
    { icon: 'fire',        title: 'On fire',           desc: '7 study days in a row',    earned: streak >= 7,     progress: `${Math.min(streak,7)}/7` },
    { icon: 'assignments', title: 'Assignment slayer', desc: 'Finished 10 assignments',  earned: completed >= 10, progress: `${Math.min(completed,10)}/10` },
    { icon: 'study',       title: 'Deep worker',       desc: '5 hours studied this week', earned: weekMin >= 300,  progress: `${Math.min(weekMin,300)}/300 min` },
    { icon: 'check',       title: 'Finisher',          desc: 'Finished a project',       earned: projCount >= 1,  progress: `${Math.min(projCount,1)}/1` },
    { icon: 'camera',      title: 'Story keeper',      desc: 'Saved 10 memories',        earned: memCount >= 10,  progress: `${Math.min(memCount,10)}/10` },
  ]
})
</script>

<template>
  <Card>
    <h3 class="font-semibold mb-3">Achievements</h3>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <div v-for="b in badges" :key="b.title"
           :class="['rounded-xl border p-3 flex items-start gap-2 transition-colors',
                    b.earned
                      ? 'border-brand-300 bg-brand-50/60 dark:bg-brand-900/20 dark:border-brand-800'
                      : 'border-surface-border dark:border-night-700 opacity-70']">
        <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                       b.earned ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300' : 'bg-night-500/10 text-night-400']">
          <Icon :name="b.icon" :size="18" />
        </span>
        <div class="min-w-0">
          <div class="text-sm font-medium">{{ b.title }}</div>
          <div class="text-[11px] text-night-500 truncate">{{ b.desc }}</div>
          <div v-if="b.progress" class="text-[10px] text-night-400 mt-0.5">{{ b.progress }}</div>
        </div>
      </div>
    </div>
  </Card>
</template>
