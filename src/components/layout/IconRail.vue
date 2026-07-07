<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

const route = useRoute()

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

const isActive = (to: string) =>
  to === '/' ? route.path === '/' : route.path.startsWith(to)
</script>

<template>
  <div class="hidden lg:flex flex-col items-center gap-4 py-4 shrink-0">
    <!-- main rail -->
    <nav class="glass-rail flex flex-col items-center gap-1.5 p-2">
      <RouterLink to="/" class="rail-item !h-11 !w-11 mb-1" aria-label="Uni Life home">
        <span class="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white font-bold text-sm">U</span>
      </RouterLink>
      <span class="h-px w-6 bg-white/10 mb-1" />
      <RouterLink v-for="it in items" :key="it.to" :to="it.to"
        :class="['rail-item group/rail', isActive(it.to) && 'rail-item-active']"
        :aria-label="it.label" :aria-current="isActive(it.to) ? 'page' : undefined">
        <Icon :name="it.icon" :size="20" />
        <!-- tooltip -->
        <span class="pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-lg
                     bg-night-900/90 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg backdrop-blur
                     transition-opacity duration-150 group-hover/rail:opacity-100 dark:bg-black/70">
          {{ it.label }}
        </span>
      </RouterLink>
    </nav>

    <!-- settings module (visually separated, like the reference) -->
    <div class="glass-rail flex flex-col items-center gap-1.5 p-2 mt-auto">
      <div class="rail-item"><ThemeToggle bare /></div>
      <RouterLink to="/settings" class="rail-item group/rail" :class="route.path === '/settings' && 'rail-item-active'" aria-label="Settings">
        <Icon name="settings" :size="20" />
        <span class="pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-lg
                     bg-night-900/90 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg backdrop-blur
                     transition-opacity duration-150 group-hover/rail:opacity-100 dark:bg-black/70">Settings</span>
      </RouterLink>
    </div>
  </div>
</template>
