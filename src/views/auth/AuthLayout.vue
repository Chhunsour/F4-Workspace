<script setup lang="ts">
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import Logo from '@/components/layout/Logo.vue'
import Icon from '@/components/ui/Icon.vue'
</script>

<template>
  <div class="relative flex min-h-dvh flex-col overflow-hidden">
    <!-- Quiet atmosphere over the app's ambient background: one blue wash, one warm highlight -->
    <div aria-hidden="true" class="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-500/10 blur-3xl" />
    <div aria-hidden="true" class="pointer-events-none absolute -bottom-48 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent-300/10 blur-3xl" />

    <header class="relative flex items-center justify-between px-5 py-4 sm:px-8"
            style="padding-top: max(1rem, env(safe-area-inset-top))">
      <RouterLink to="/sign-in" class="flex items-center gap-2.5 rounded-lg">
        <Logo size="sm" />
        <span class="font-semibold">Uni Life</span>
      </RouterLink>
      <ThemeToggle />
    </header>

    <main class="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-6 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-10"
          style="padding-bottom: max(2.5rem, env(safe-area-inset-bottom))">
      <!-- Left: product intro with widget previews (desktop only, decorative) -->
      <section class="auth-rise hidden lg:block" aria-hidden="true">
        <p class="max-w-lg text-[32px] font-semibold leading-[1.18] tracking-tight text-night-900 dark:text-white">
          Your classes, projects, study sessions, and memories — all in one place.
        </p>
        <p class="mt-3 text-night-500 dark:text-night-300">Built for Batch 22 · Evening shift.</p>

        <div class="mt-9 max-w-sm space-y-3">
          <div class="card auth-rise flex items-center gap-3 p-4" style="animation-delay: 60ms">
            <span class="h-10 w-1.5 shrink-0 rounded-full bg-brand-500" />
            <div class="min-w-0 flex-1">
              <p class="t-section">Next class</p>
              <p class="truncate text-sm font-semibold">Database Systems</p>
              <p class="truncate text-xs text-night-500 dark:text-night-300">Tonight · 5:30 PM · Room B204</p>
            </div>
            <span class="shrink-0 rounded-full bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-300/15 dark:text-accent-300">in 2h 10m</span>
          </div>

          <div class="card auth-rise flex items-center gap-3 p-4" style="animation-delay: 120ms">
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-night-300 dark:border-night-500" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold">ER diagram draft</p>
              <p class="truncate text-xs text-night-500 dark:text-night-300">Database Systems · due tomorrow</p>
            </div>
            <Icon name="assignments" :size="16" class="shrink-0 text-night-400" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="card auth-rise p-4" style="animation-delay: 180ms">
              <span class="chip"><Icon name="fire" :size="12" /> 6-day streak</span>
              <div class="mb-1.5 mt-3 flex justify-between text-xs text-night-500 dark:text-night-300">
                <span>Weekly goal</span><span>68%</span>
              </div>
              <div class="h-1.5 w-full overflow-hidden rounded-full bg-night-100 dark:bg-night-700">
                <div class="h-full w-[68%] rounded-full bg-brand-500" />
              </div>
            </div>
            <div class="card auth-rise p-4" style="animation-delay: 240ms">
              <span class="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/12 text-brand-600 dark:text-brand-300">
                <Icon name="camera" :size="16" />
              </span>
              <p class="mt-2.5 truncate text-sm font-semibold">Project night</p>
              <p class="truncate text-xs text-night-500 dark:text-night-300">Shared by your group</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Right: the form panel -->
      <div class="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
        <div class="glass-panel auth-rise p-6 sm:p-8" style="animation-delay: 80ms">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@keyframes authRise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
}
.auth-rise { animation: authRise 280ms cubic-bezier(0.22, 1, 0.36, 1) both; }
</style>
