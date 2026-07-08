import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/sign-in',        component: () => import('@/views/auth/SignInView.vue'),        meta: { public: true, layout: 'auth' } },
  { path: '/sign-up',        component: () => import('@/views/auth/SignUpView.vue'),        meta: { public: true, layout: 'auth' } },
  { path: '/forgot-password',component: () => import('@/views/auth/ForgotPasswordView.vue'),meta: { public: true, layout: 'auth' } },
  { path: '/reset-password', component: () => import('@/views/auth/ResetPasswordView.vue'), meta: { public: true, recovery: true, layout: 'auth' } },

  // Focus mode is deliberately outside the shell for a distraction-free UI.
  { path: '/focus', name: 'focus', component: () => import('@/views/FocusView.vue') },

  {
    path: '/',
    component: () => import('@/components/layout/AppShell.vue'),
    children: [
      { path: '',             name: 'dashboard',   component: () => import('@/views/DashboardView.vue') },
      { path: 'schedule',     name: 'schedule',    component: () => import('@/views/ScheduleView.vue') },
      { path: 'subjects/:id', name: 'subject',     component: () => import('@/views/SubjectView.vue'), props: true },
      { path: 'assignments',  name: 'assignments', component: () => import('@/views/AssignmentsView.vue') },
      { path: 'projects',     name: 'projects',    component: () => import('@/views/ProjectsView.vue') },
      { path: 'projects/:id', name: 'project',     component: () => import('@/views/ProjectDetailView.vue'), props: true },
      { path: 'study',        name: 'study',       component: () => import('@/views/StudyView.vue') },
      { path: 'calendar',     name: 'calendar',    component: () => import('@/views/CalendarView.vue') },
      { path: 'notes',        name: 'notes',       component: () => import('@/views/NotesView.vue') },
      { path: 'memory',       name: 'memory-dashboard', component: () => import('@/views/MemoriesView.vue') },
      { path: 'memories',     name: 'memories',    component: () => import('@/views/MemoriesView.vue') },
      { path: 'memories/:id', name: 'memory',      component: () => import('@/views/MemoryDetailView.vue'), props: true },
      { path: 'team',         name: 'team',        component: () => import('@/views/TeamView.vue') },
      { path: 'groups',       name: 'groups',      component: () => import('@/views/GroupsView.vue') },
      { path: 'groups/:id',   name: 'group',       component: () => import('@/views/GroupDetailView.vue'), props: true },
      { path: 'profile',      name: 'profile',     component: () => import('@/views/ProfileView.vue') },
      { path: 'settings',     name: 'settings',    component: () => import('@/views/SettingsView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved ?? { top: 0 },
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  // Defence in depth: main.ts awaits auth.init() before mounting the router,
  // so auth.ready is already true by the time this guard runs. But if that
  // order ever gets rearranged, don't bounce anyone to /sign-in based on the
  // pre-init null userId — let the destination render and let the listener
  // catch up. Prevents the "flash of sign-in on cold start" failure mode.
  if (!auth.ready) return true
  const isPublic = !!to.meta.public
  const isRecovery = !!to.meta.recovery
  if (import.meta.env.DEV) {
    console.debug('[router]', to.fullPath, 'signedIn=' + auth.isSignedIn, 'public=' + isPublic)
  }
  if (!auth.isSignedIn && !isPublic) return { path: '/sign-in', query: { next: to.fullPath } }
  // Signed-in users bouncing off a public page — but stay on recovery so they can update their password.
  if (auth.isSignedIn && isPublic && !isRecovery) return { path: '/' }
})

export default router
