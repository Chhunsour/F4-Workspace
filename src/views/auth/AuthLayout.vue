<script setup lang="ts">
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import Logo from '@/components/layout/Logo.vue'

const features = [
  { icon: '🗓️', text: 'Timetable + next-class countdown' },
  { icon: '✅', text: 'Assignment & deadline tracker' },
  { icon: '🎯', text: 'Focus timer with study streaks' },
  { icon: '📸', text: 'Shared campus memories' },
]
</script>

<template>
  <div class="min-h-dvh grid lg:grid-cols-[1.05fr_1fr] bg-surface-light dark:bg-night-950">
    <!-- left: solid brand hero -->
    <div class="hidden lg:flex relative bg-brand-700 text-white p-12 overflow-hidden">
      <!-- subtle solid accent bar, not a gradient -->
      <div class="absolute top-0 left-0 h-1.5 w-full bg-accent-300" />
      <div class="relative m-auto max-w-md space-y-9">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-white text-brand-700 grid place-items-center font-bold text-lg">U</div>
          <div class="text-lg font-semibold">Uni Life</div>
        </div>
        <div>
          <h2 class="text-[34px] leading-[1.1] font-semibold tracking-tight">
            Your student life,<br />organized — and a<br />little more fun.
          </h2>
          <p class="mt-4 text-brand-100 leading-relaxed">
            Classes, assignments, projects, study streaks, and the memories in
            between. One calm place, built for Batch 22.
          </p>
        </div>
        <ul class="space-y-2.5">
          <li v-for="f in features" :key="f.text" class="flex items-center gap-3 text-[15px] text-brand-50">
            <span class="h-9 w-9 rounded-lg bg-brand-600 grid place-items-center text-base shrink-0">{{ f.icon }}</span>
            {{ f.text }}
          </li>
        </ul>
      </div>
    </div>

    <!-- right: form -->
    <div class="flex flex-col min-h-dvh">
      <div class="flex items-center justify-between p-4 sm:p-6">
        <RouterLink to="/sign-in" class="lg:hidden flex items-center gap-2.5">
          <Logo size="sm" />
          <span class="font-semibold">Uni Life</span>
        </RouterLink>
        <div class="ml-auto"><ThemeToggle /></div>
      </div>
      <div class="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div class="w-full max-w-sm">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
