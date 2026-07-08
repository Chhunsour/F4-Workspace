<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const primary = [
  { to: '/',            label: 'Home',     icon: 'home' },
  { to: '/schedule',    label: 'Schedule', icon: 'schedule' },
  { to: '/assignments', label: 'Tasks',    icon: 'assignments' },
  { to: '/study',       label: 'Study',    icon: 'study' },
]
const secondary = [
  { to: '/projects', label: 'Projects', icon: 'projects' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/notes',    label: 'Notes',    icon: 'notes' },
  { to: '/memory',   label: 'Memory',   icon: 'memories' },
  { to: '/team',     label: 'Team',     icon: 'team' },
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
               :class="['relative flex flex-col items-center justify-center gap-1 rounded-xl py-3 text-[11px] transition-colors',
                        isActive
                          ? 'text-brand-700 dark:text-brand-200 font-semibold bg-brand-500/12 dark:bg-brand-400/18'
                          : 'text-night-600 dark:text-night-100 active:bg-brand-500/8 dark:active:bg-brand-400/10']">
              <Icon :name="s.icon" :size="22" />
              <span>{{ t(s.label) }}</span>
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
               class="relative flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors"
               :class="(p.to === '/' ? isExactActive : isActive) ? 'text-brand-700 dark:text-brand-200 font-semibold' : 'text-night-500 dark:text-night-200'">
              <span class="flex items-center justify-center h-8 w-14 rounded-full transition-all duration-200"
                    :class="(p.to === '/' ? isExactActive : isActive)
                      ? 'bg-brand-500/18 dark:bg-brand-400/25 shadow-[inset_0_0_0_1px_rgba(91,123,212,0.28)]'
                      : ''">
                <Icon :name="p.icon" :size="21" />
              </span>
              <span>{{ t(p.label) }}</span>
              <span v-if="(p.to === '/' ? isExactActive : isActive)"
                    class="absolute -bottom-1 h-1 w-1 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(91,123,212,0.7)]" />
            </a>
          </RouterLink>
        </li>
        <li class="contents">
          <button class="relative flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors"
                  :class="showMore ? 'text-brand-700 dark:text-brand-200 font-semibold' : 'text-night-500 dark:text-night-200'"
                  @click="showMore = !showMore" :aria-label="t('More')">
            <span class="flex items-center justify-center h-8 w-14 rounded-full transition-all duration-200"
                  :class="showMore ? 'bg-brand-500/18 dark:bg-brand-400/25 shadow-[inset_0_0_0_1px_rgba(91,123,212,0.28)]' : ''">
              <Icon name="more" :size="21" />
            </span>
            <span>{{ t('More') }}</span>
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>
