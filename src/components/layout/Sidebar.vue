<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Logo from './Logo.vue'
import { useAuthStore } from '@/stores/auth'
import { RouterLink } from 'vue-router'

const auth = useAuthStore()

const items = [
  { to: '/',            label: 'Dashboard',   icon: 'dashboard' },
  { to: '/schedule',    label: 'Schedule',    icon: 'schedule' },
  { to: '/assignments', label: 'Assignments', icon: 'assignments' },
  { to: '/projects',    label: 'Projects',    icon: 'projects' },
  { to: '/study',       label: 'Study',       icon: 'study' },
  { to: '/calendar',    label: 'Calendar',    icon: 'calendar' },
  { to: '/notes',       label: 'Notes',       icon: 'notes' },
  { to: '/memories',    label: 'Memories',    icon: 'memories' },
  { to: '/groups',      label: 'Groups',      icon: 'groups' },
]
</script>

<template>
  <aside class="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-surface-border dark:border-night-800 bg-white dark:bg-night-900">
    <div class="h-16 flex items-center gap-2.5 px-4 border-b border-surface-border dark:border-night-800">
      <Logo size="md" />
      <div class="leading-tight">
        <div class="font-semibold text-[15px]">Uni Life</div>
        <div class="text-[11px] text-night-500 dark:text-night-400">Batch 22 · Evening</div>
      </div>
    </div>

    <nav class="p-2.5 space-y-0.5 flex-1 overflow-y-auto">
      <RouterLink v-for="item in items" :key="item.to" :to="item.to"
        v-slot="{ isActive, isExactActive }" custom>
        <a :href="item.to"
           @click.prevent="$router.push(item.to)"
           :class="[
             'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
             (item.to === '/' ? isExactActive : isActive)
               ? 'bg-brand-50 dark:bg-brand-500/12 text-brand-700 dark:text-brand-200 font-semibold'
               : 'text-night-600 dark:text-night-200 hover:bg-night-100 dark:hover:bg-night-800 hover:text-night-900 dark:hover:text-white'
           ]">
          <span v-if="(item.to === '/' ? isExactActive : isActive)"
                class="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-brand-600 dark:bg-brand-400" />
          <Icon :name="item.icon" :size="20" class="shrink-0" />
          <span>{{ item.label }}</span>
        </a>
      </RouterLink>
    </nav>

    <RouterLink to="/profile"
      class="m-2.5 flex items-center gap-3 rounded-lg p-2 border border-surface-border dark:border-night-700 hover:bg-night-50 dark:hover:bg-night-800 transition-colors">
      <Avatar :src="auth.avatarPublicUrl" :name="auth.displayName" size="md" />
      <div class="min-w-0 flex-1">
        <div class="text-sm font-medium truncate">{{ auth.displayName }}</div>
        <div class="text-[11px] text-night-500 dark:text-night-400 truncate">{{ auth.email }}</div>
      </div>
      <Icon name="settings" :size="16" class="text-night-400 shrink-0" />
    </RouterLink>
  </aside>
</template>
