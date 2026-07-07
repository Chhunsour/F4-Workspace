import { onScopeDispose, ref, computed } from 'vue'
import { humanCountdown } from '@/lib/utils'

// Ticks once a second while any component uses it. One shared interval.
let refs = 0
let interval: number | null = null
const now = ref(new Date())

function ensureRunning() {
  if (interval == null) {
    interval = window.setInterval(() => { now.value = new Date() }, 1000)
  }
}
function maybeStop() {
  if (refs <= 0 && interval != null) {
    clearInterval(interval); interval = null
  }
}

export function useNow() {
  refs++
  ensureRunning()
  onScopeDispose(() => { refs--; maybeStop() })
  return now
}

export function useCountdown(target: () => Date | null | undefined) {
  const n = useNow()
  const label = computed(() => {
    const t = target()
    if (!t) return ''
    return humanCountdown(t, n.value)
  })
  const isPast = computed(() => {
    const t = target()
    return t ? t.getTime() < n.value.getTime() : false
  })
  return { label, isPast, now: n }
}
