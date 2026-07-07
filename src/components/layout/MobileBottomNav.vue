<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import { ref } from 'vue'

const primary = [
  { to: '/',            label: 'Home',     icon: 'dashboard' },
  { to: '/schedule',    label: 'Schedule', icon: 'schedule' },
  { to: '/assignments', label: 'Tasks',    icon: 'assignments' },
  { to: '/study',       label: 'Study',    icon: 'study' },
]
const secondary = [
  { to: '/projects', label: 'Projects', icon: 'projects' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/notes',    label: 'Notes',    icon: 'notes' },
  { to: '/memories', label: 'Memories', icon: 'memories' },
  { to: '/groups',   label: 'Groups',   icon: 'groups' },
  { to: '/profile',  label: 'Profile',  icon: 'profile' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]
const showMore = ref(false)
</script>

<template>
  <transition name="fade">
    <div v-if="showMore" class="lg:hidden fixed inset-0 z-40 bg-night-950/40 backdrop-blur-sm" @click="showMore = false" />
  </transition>

  <div class="lg:hidden fixed bottom-3 inset-x-3 z-50">
    <transition name="fade">
      <div v-if="showMore" class="glass-panel !rounded-2xl mb-2 p-2.5">
        <div class="grid grid-cols-4 gap-1.5">
          <RouterLink v-for="s in secondary" :key="s.to" :to="s.to" v-slot="{ isActive }" custom>
            <a :href="s.to" @click.prevent="$router.push(s.to); showMore = false"
               :class="['flex flex-col items-center justify-center gap-1 rounded-xl py-3 text-[11px] transition-colors',
                        isActive ? 'nav-item-active !py-3' : 'text-night-600 dark:text-night-200 active:bg-white/40 dark:active:bg-white/5']">
              <Icon :name="s.icon" :size="22" />
              <span>{{ s.label }}</span>
            </a>
          </RouterLink>
        </div>
      </div>
    </transition>

    <nav class="glass-panel !rounded-2xl h-16 px-1.5">
      <ul class="grid grid-cols-5 h-full">
        <li v-for="p in primary" :key="p.to" class="contents">
          <RouterLink :to="p.to" v-slot="{ isExactActive, isActive }" custom>
            <a :href="p.to" @click.prevent="$router.push(p.to); showMore = false"
               class="flex flex-col items-center justify-center gap-1 text-[11px] transition-colors"
               :class="(p.to === '/' ? isExactActive : isActive) ? 'text-brand-600 dark:text-brand-300 font-medium' : 'text-night-500 dark:text-night-400'">
              <span class="flex items-center justify-center h-7 w-12 rounded-full transition-colors"
                    :class="(p.to === '/' ? isExactActive : isActive) ? 'bg-brand-500/15' : ''">
                <Icon :name="p.icon" :size="21" />
              </span>
              <span>{{ p.label }}</span>
            </a>
          </RouterLink>
        </li>
        <li class="contents">
          <button class="flex flex-col items-center justify-center gap-1 text-[11px] transition-colors"
                  :class="showMore ? 'text-brand-600 dark:text-brand-300 font-medium' : 'text-night-500 dark:text-night-400'"
                  @click="showMore = !showMore" aria-label="More">
            <span class="flex items-center justify-center h-7 w-12 rounded-full transition-colors" :class="showMore ? 'bg-brand-500/15' : ''">
              <Icon name="more" :size="21" />
            </span>
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>
