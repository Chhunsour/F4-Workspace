import { reactive } from 'vue'
import { nanoid } from '@/lib/utils'

export type ToastKind = 'success' | 'info' | 'error' | 'warning'
export interface Toast {
  id: string
  kind: ToastKind
  title: string
  body?: string
  timeoutMs?: number
}

const state = reactive({ items: [] as Toast[] })

function push(t: Omit<Toast, 'id'>) {
  const id = nanoid(8)
  const item: Toast = { id, timeoutMs: 3200, ...t }
  state.items.push(item)
  if (item.timeoutMs && item.timeoutMs > 0) {
    setTimeout(() => dismiss(id), item.timeoutMs)
  }
  return id
}

function dismiss(id: string) {
  const i = state.items.findIndex(x => x.id === id)
  if (i !== -1) state.items.splice(i, 1)
}

export function useToast() {
  return {
    items:    state.items,
    success:  (title: string, body?: string) => push({ kind: 'success', title, body }),
    info:     (title: string, body?: string) => push({ kind: 'info',    title, body }),
    warning:  (title: string, body?: string) => push({ kind: 'warning', title, body }),
    error:    (title: string, body?: string) => push({ kind: 'error',   title, body, timeoutMs: 5000 }),
    dismiss,
  }
}
