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
  <section v-if="pick">
    <h3 class="t-section mb-3">Memory moment</h3>
    <RouterLink :to="`/memories/${pick.m.id}`"
                class="media lift group relative block aspect-[16/10]">
      <img :src="mem.thumbnailUrl(pick.m.id)!" loading="lazy" decoding="async"
           class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" alt="" />
      <!-- Subtle brand tint overlay on hover -->
      <div class="absolute inset-0 bg-gradient-to-t from-brand-900/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div class="img-caption">
        <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-200">✦ {{ pick.ago }} days ago</p>
        <div class="mt-0.5 flex items-baseline justify-between gap-2">
          <span class="truncate text-[15px] font-semibold">{{ pick.m.title || 'Untitled' }}</span>
          <span class="shrink-0 text-xs opacity-80 tabular-nums">{{ fmtDate(pick.m.event_date ?? pick.m.created_at, { month:'short', day:'numeric', year:'numeric' }) }}</span>
        </div>
      </div>
    </RouterLink>
  </section>
</template>
