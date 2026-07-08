<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import Button from './Button.vue'
import { useI18n } from '@/composables/useI18n'
const c = useConfirm()
const { t } = useI18n()
</script>
<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="c.state.current" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-night-950/50 dark:bg-[rgba(24,25,28,0.72)] backdrop-blur-sm" @click="c.respond(false)" />
        <div class="relative w-full max-w-sm bg-white dark:bg-[var(--surface-elevated)] rounded-2xl shadow-cardH border border-surface-border dark:border-[var(--border-soft)] p-5 animate-slideUp">
          <h3 class="font-semibold text-night-900 dark:text-night-50">{{ c.state.current.title }}</h3>
          <p v-if="c.state.current.body" class="text-sm text-night-500 dark:text-[var(--text-secondary)] mt-1">{{ c.state.current.body }}</p>
          <div class="mt-5 flex justify-end gap-2">
            <Button variant="ghost" size="sm" @click="c.respond(false)">{{ c.state.current.cancelLabel ?? t('Cancel') }}</Button>
            <Button :variant="c.state.current.destructive ? 'danger' : 'primary'" size="sm" @click="c.respond(true)">
              {{ c.state.current.confirmLabel ?? t('Confirm') }}
            </Button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>
