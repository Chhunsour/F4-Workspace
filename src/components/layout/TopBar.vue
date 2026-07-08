<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Logo from './Logo.vue'
import NotificationBell from './NotificationBell.vue'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'

const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()

const titleMap: Record<string, string> = {
  dashboard: 'Home', schedule: 'Schedule', subject: 'Subject', assignments: 'Tasks',
  projects: 'Projects', project: 'Project', study: 'Study', focus: 'Focus',
  calendar: 'Calendar', notes: 'Notes', memories: 'Memory', 'memory-dashboard': 'Memory', memory: 'Memory',
  groups: 'Groups', group: 'Group', profile: 'Profile', settings: 'Settings',
}
const title = computed(() => t(titleMap[String(route.name ?? 'dashboard')] ?? 'Uni Life'))
</script>

<template>
  <!-- Mobile top chrome only; desktop navigation lives in the rail + nav panel. -->
  <header class="lg:hidden glass-panel !rounded-2xl h-14 flex items-center gap-3 px-3">
    <RouterLink to="/" class="flex items-center gap-2.5">
      <Logo size="sm" />
    </RouterLink>
    <h1 class="text-base font-semibold tracking-tight truncate">{{ title }}</h1>
    <div class="ml-auto flex items-center gap-2">
      <NotificationBell />
      <ThemeToggle />
      <RouterLink to="/profile" :aria-label="t('Profile')">
        <Avatar :src="auth.avatarPublicUrl" :name="auth.displayName" size="md" />
      </RouterLink>
    </div>
  </header>
</template>
