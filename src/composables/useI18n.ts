import { computed } from 'vue'
import en from '@/locales/en'
import km from '@/locales/km'
import { languages, useLanguageStore, type Language } from '@/stores/language'

const dictionaries: Record<Language, Record<string, string>> = { en, km }

export function interpolate(text: string, params?: Record<string, string | number>) {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`))
}

export function useI18n() {
  const language = useLanguageStore()

  function t(key: string, params?: Record<string, string | number>) {
    const translated = dictionaries[language.current]?.[key] ?? key
    return interpolate(translated, params)
  }

  return {
    t,
    language: computed(() => language.current),
    isKhmer: computed(() => language.isKhmer),
    languages,
    setLanguage: language.setLanguage,
  }
}
