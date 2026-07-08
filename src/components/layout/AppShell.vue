<script setup lang="ts">
import IconRail from './IconRail.vue'
import TopBar from './TopBar.vue'
import MobileBottomNav from './MobileBottomNav.vue'
import { onMounted } from 'vue'
import { useSubjectsStore } from '@/stores/subjects'

const subjects = useSubjectsStore()
onMounted(() => { subjects.fetch().catch(() => {}) })
</script>

<template>
  <div class="min-h-dvh flex p-3 lg:p-4">
    <!-- Icon rail: always visible on desktop. Tight gap so the context panel
         reads as sliding out of the same navigation system. -->
    <IconRail class="lg:mr-3" />

    <!-- Main workspace: flex-1 always fills remaining space -->
    <div class="flex-1 min-w-0 flex flex-col gap-3">
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

