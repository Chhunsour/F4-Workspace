import { reactive } from 'vue'

interface ConfirmRequest {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  resolve: (ok: boolean) => void
}

const state = reactive<{ current: ConfirmRequest | null }>({ current: null })

export function useConfirm() {
  return {
    state,
    ask(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
      return new Promise((resolve) => { state.current = { ...opts, resolve } })
    },
    respond(ok: boolean) {
      state.current?.resolve(ok)
      state.current = null
    },
  }
}
