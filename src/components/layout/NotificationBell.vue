<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import { useNotificationsStore, notificationRoute } from '@/stores/notifications'
import { fmtDate } from '@/lib/utils'
import type { Notification } from '@/types'

const store = useNotificationsStore()
const router = useRouter()
const open = ref(false)

onMounted(() => {
  store.fetch().catch(() => {})
  store.subscribe()
})

function openItem(n: Notification) {
  store.markRead(n.id)
  open.value = false
  router.push(notificationRoute(n))
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d}d` : fmtDate(iso, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="relative">
    <button class="relative grid h-9 w-9 place-items-center rounded-xl text-night-500 dark:text-night-300
                   hover:text-night-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            :aria-label="store.unreadCount ? `Notifications, ${store.unreadCount} unread` : 'Notifications'"
            @click="open = !open">
      <Icon name="bell" :size="19" />
      <span v-if="store.unreadCount"
            class="absolute -top-0.5 -right-0.5 grid min-w-[17px] h-[17px] place-items-center rounded-full
                   bg-red-500 px-1 text-[10px] font-bold text-white">
        {{ store.unreadCount > 9 ? '9+' : store.unreadCount }}
      </span>
    </button>

    <!-- click-away backdrop -->
    <div v-if="open" class="fixed inset-0 z-40" @click="open = false" />

    <transition name="fade">
      <div v-if="open"
           class="glass-panel absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden !rounded-2xl">
        <div class="flex items-center justify-between px-4 py-3">
          <span class="t-card !text-sm">Notifications</span>
          <button v-if="store.unreadCount" class="link text-xs" @click="store.markAllRead()">Mark all read</button>
        </div>
        <div class="divider" />
        <ul v-if="store.items.length" class="max-h-[60vh] overflow-y-auto py-1">
          <li v-for="n in store.items" :key="n.id">
            <button class="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    @click="openItem(n)">
              <span :class="['mt-1.5 h-2 w-2 shrink-0 rounded-full', n.is_read ? 'bg-transparent' : 'bg-brand-500']" />
              <span class="min-w-0 flex-1">
                <span :class="['block text-sm leading-snug', n.is_read ? 'text-night-600 dark:text-night-300' : 'font-medium text-night-900 dark:text-white']">
                  {{ n.title }}
                </span>
                <span v-if="n.body" class="mt-0.5 block truncate text-xs text-night-500 dark:text-night-400">{{ n.body }}</span>
              </span>
              <span class="shrink-0 text-[11px] text-night-400 tabular-nums">{{ timeAgo(n.created_at) }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="px-4 py-8 text-center text-sm text-night-500 dark:text-night-300">
          Nothing yet — activity from your groups and projects lands here.
        </p>
      </div>
    </transition>
  </div>
</template>
