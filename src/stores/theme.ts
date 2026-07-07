import { defineStore } from 'pinia'

type Mode = 'light' | 'dark' | 'system'
const KEY = 'uni-life-theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({ mode: 'system' as Mode }),
  getters: {
    resolved(): 'light' | 'dark' {
      if (this.mode !== 'system') return this.mode
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    },
  },
  actions: {
    init() {
      const saved = localStorage.getItem(KEY) as Mode | null
      this.mode = saved ?? 'system'
      this.apply()
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.mode === 'system') this.apply()
      })
    },
    apply() {
      const dark = this.resolved === 'dark'
      document.documentElement.classList.toggle('dark', dark)
    },
    setMode(m: Mode) {
      this.mode = m
      localStorage.setItem(KEY, m)
      this.apply()
    },
    toggle() {
      this.setMode(this.resolved === 'dark' ? 'light' : 'dark')
    },
  },
})
