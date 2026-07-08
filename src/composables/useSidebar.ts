import { computed } from 'vue'
import { defineStore } from 'pinia'

// Sidebar open/closed state lives in a Pinia store, NOT a module-scoped ref.
// Pinia dedupes stores by id, so even if this module gets instantiated twice
// (dev-server HMR is notorious for this), every component talks to the SAME
// state — the collapse button can never go out of sync with the AppShell.
const KEY = 'uni-life-sidebar'

const useSidebarStore = defineStore('sidebar', {
  state: () => ({
    open: (() => { try { return localStorage.getItem(KEY) !== 'closed' } catch { return true } })(),
  }),
  actions: {
    set(v: boolean) {
      this.open = v
      try { localStorage.setItem(KEY, v ? 'open' : 'closed') } catch { /* ignore */ }
    },
  },
})

export function useSidebar() {
  const store = useSidebarStore()
  return {
    open:   computed(() => store.open),
    toggle: () => store.set(!store.open),
    show:   () => store.set(true),
    close:  () => store.set(false),
  }
}
