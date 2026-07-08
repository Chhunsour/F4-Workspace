import { defineStore } from 'pinia'

export type Language = 'en' | 'km'

const KEY = 'uni-life-language'

export const languages: { value: Language; label: string; nativeLabel: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'km', label: 'Khmer', nativeLabel: 'ភាសាខ្មែរ' },
]

export const useLanguageStore = defineStore('language', {
  state: () => ({ current: 'en' as Language }),
  getters: {
    isKhmer: (state) => state.current === 'km',
  },
  actions: {
    init() {
      const saved = localStorage.getItem(KEY) as Language | null
      this.current = saved === 'km' || saved === 'en' ? saved : 'en'
      this.apply()
    },
    setLanguage(language: Language) {
      this.current = language
      localStorage.setItem(KEY, language)
      this.apply()
    },
    apply() {
      const root = document.documentElement
      root.lang = this.current === 'km' ? 'km' : 'en'
      root.classList.toggle('lang-km', this.current === 'km')
    },
  },
})
