<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useMemoriesStore } from '@/stores/memories'
import { fmtDate, daysBetween } from '@/lib/utils'

const mem = useMemoriesStore()

// A memory from a while back, rotating daily. Quiet by design — the card
// simply doesn't render until there's something old enough to resurface.
const pick = computed(() => {
  const now = new Date()
  const old = mem.items.filter(m => {
    const d = m.event_date ? new Date(m.event_date + 'T00:00:00') : new Date(m.created_at)
    return daysBetween(d, now) >= 30 && mem.thumbnailUrl(m.id)
  })
  if (!old.length) return null
  const seed = now.getDate() + now.getMonth() * 31
  const m = old[seed % old.length]
  const d = m.event_date ? new Date(m.event_date + 'T00:00:00') : new Date(m.created_at)
  return { m, ago: daysBetween(d, now) }
})
</script>

<template>
  <RouterLink v-if="pick" :to="`/memories/${pick.m.id}`"
              class="card card-hover relative block aspect-[16/10] overflow-hidden !p-0">
    <img :src="mem.thumbnailUrl(pick.m.id)!" loading="lazy" decoding="async"
         class="absolute inset-0 h-full w-full object-cover" alt="" />
    <div class="img-caption">
      <p class="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/70">Remember this day?</p>
      <div class="mt-0.5 flex items-baseline justify-between gap-2">
        <span class="truncate text-sm font-medium">{{ pick.m.title || 'Untitled' }}</span>
        <span class="shrink-0 text-xs opacity-80">{{ fmtDate(pick.m.event_date ?? pick.m.created_at, { month:'short', day:'numeric', year:'numeric' }) }}</span>
      </div>
    </div>
  </RouterLink>
</template>
