import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import './style.css'

const app = createApp(App)
app.use(createPinia())

// Theme + session bootstrap before router mounts to avoid guard flash.
const theme = useThemeStore()
theme.init()

const auth = useAuthStore()
auth.init().finally(() => {
  app.use(router)
  app.mount('#app')
})
