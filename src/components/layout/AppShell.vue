<script setup lang="ts">
import IconRail from './IconRail.vue'
import NavPanel from './NavPanel.vue'
import TopBar from './TopBar.vue'
import MobileBottomNav from './MobileBottomNav.vue'
import { onMounted } from 'vue'
import { useSubjectsStore } from '@/stores/subjects'

const subjects = useSubjectsStore()
onMounted(() => { subjects.fetch().catch(() => {}) })
</script>

<template>
  <div class="min-h-dvh flex gap-3 p-3 lg:p-4 lg:pr-4">
    <IconRail />
    <NavPanel />

    <div class="flex-1 min-w-0 flex flex-col gap-3">
      <!-- Mobile chrome only; desktop uses the rail + panel -->
      <TopBar />

      <main class="glass-panel flex-1 min-w-0 overflow-y-auto lg:h-[calc(100dvh-2rem)]
                   px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-8 !rounded-3xl">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <MobileBottomNav />
  </div>
</template>
