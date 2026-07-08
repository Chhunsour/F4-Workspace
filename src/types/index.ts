export * from './database'
export { WEEKDAY_LABELS, WEEKDAY_LONG } from '@/lib/utils'

export const PRIORITY_LABELS = {
  low:     { label: 'Low',     tone: 'bg-night-100 text-night-700 dark:bg-night-700 dark:text-night-100' },
  normal:  { label: 'Normal',  tone: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' },
  high:    { label: 'High',    tone: 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-200' },
  urgent:  { label: 'Urgent',  tone: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' },
} as const

export const STATUS_LABELS = {
  todo:        { label: 'To Do',       tone: 'bg-night-100 text-night-700 dark:bg-night-700 dark:text-night-100' },
  in_progress: { label: 'In Progress', tone: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' },
  review:      { label: 'Review',      tone: 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-200' },
  completed:   { label: 'Completed',   tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' },
} as const

// Academic event types shown in the Add flow, schedule, calendar and home.
// Accents kept restrained (spec: not too colorful): exam=orange, final=purple,
// presentation=warm amber. Classes keep their subject color.
export const EVENT_TYPE_META = {
  exam: {
    label: 'Exam',
    color: '#f59a06',          // orange
    icon: 'assignments',
  },
  final_exam: {
    label: 'Final Exam',
    color: '#8b5cf6',          // purple
    icon: 'study',
  },
  presentation: {
    label: 'Presentation',
    color: '#eab308',          // warm amber
    icon: 'groups',
  },
} as const

export const REMINDER_OPTIONS = [
  { value: '',   label: 'No reminder', days: null },
  { value: '1d', label: '1 day before',  days: 1 },
  { value: '3d', label: '3 days before', days: 3 },
  { value: '1w', label: '1 week before', days: 7 },
] as const

export const SUBJECT_COLOR_PALETTE = [
  '#5B7BD4', '#22c55e', '#ec4899', '#f59a06',
  '#8b5cf6', '#0ea5e9', '#ef4444', '#14b8a6',
]

export const NOTE_COLORS = [
  '#ffffff', '#fff1c4', '#fee2e2', '#dcfce7',
  '#dbeafe', '#ede9fe', '#fce7f3', '#e2e8f0',
]

export const REACTION_EMOJIS = ['❤️','😂','😭','🔥','👏','🫡']
