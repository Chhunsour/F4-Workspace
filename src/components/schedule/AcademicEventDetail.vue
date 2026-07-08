<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/ui/Modal.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { useSubjectsStore } from '@/stores/subjects'
import { useProjectsStore } from '@/stores/projects'
import { fmtDate, fmtTime, fmtDateTime, daysBetween } from '@/lib/utils'
import { EVENT_TYPE_META } from '@/types'
import type { AcademicEvent } from '@/types'
import { useI18n } from '@/composables/useI18n'
import { supabase, publicUrl } from '@/lib/supabase'

const props = defineProps<{ open: boolean; item: AcademicEvent | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'edit', ev: AcademicEvent): void }>()

const router = useRouter()
const subjects = useSubjectsStore()
const projects = useProjectsStore()
const { t } = useI18n()

const meta = computed(() => (props.item ? EVENT_TYPE_META[props.item.type] : null))
const subject = computed(() => subjects.byId(props.item?.subject_id))
const project = computed(() => projects.items.find(p => p.id === props.item?.project_id) ?? null)
const isFinal = computed(() => props.item?.type === 'final_exam')

const team = ref<{ id: string; full_name: string | null; avatar_url: string | null }[]>([])
watch(() => [props.open, props.item], async () => {
  team.value = []
  const ids = props.item?.team_members ?? []
  if (!props.open || !ids.length) return
  const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids)
  team.value = (data ?? []) as any
}, { immediate: true })

const countdown = computed(() => {
  if (!props.item) return ''
  const days = daysBetween(new Date(), new Date(props.item.event_date + 'T00:00:00'))
  if (days < 0) return t('Past')
  if (days === 0) return t('Today')
  if (days === 1) return t('Tomorrow')
  return t('Starts in {days} days', { days })
})
const timeLine = computed(() => {
  const e = props.item
  if (!e?.start_time) return ''
  return fmtTime(e.start_time) + (e.end_time ? ` – ${fmtTime(e.end_time)}` : '')
})
const avatarUrl = (p: { avatar_url: string | null }) => (p.avatar_url ? publicUrl('avatars', p.avatar_url) : null)

function go(to: string) { emit('update:open', false); router.push(to) }
</script>

<template>
  <Modal :open="props.open" :title="meta ? t(meta.label) : ''" @update:open="v => emit('update:open', v)">
    <div v-if="props.item && meta" class="space-y-4">
      <!-- Header: type label + importance for finals -->
      <div class="flex items-start gap-3">
        <span class="mt-0.5 h-11 w-1.5 shrink-0 rounded-full" :style="{ background: meta.color }" />
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wide" :style="{ color: meta.color }">{{ t(meta.label) }}</span>
            <span v-if="isFinal" class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  :style="{ background: meta.color + '22', color: meta.color }">{{ t('Important') }}</span>
          </div>
          <h3 class="mt-0.5 text-lg font-semibold text-night-900 dark:text-white">
            {{ props.item.title || subject?.name || t(meta.label) }}
          </h3>
          <p v-if="props.item.title && subject" class="text-sm text-night-500 dark:text-night-300">{{ subject.name }}</p>
        </div>
      </div>

      <!-- When / where -->
      <div class="tile p-3 text-sm">
        <div class="font-medium text-night-900 dark:text-white">{{ fmtDate(props.item.event_date, { weekday: 'long', month: 'long', day: 'numeric' }) }}</div>
        <div class="mt-0.5 text-night-600 dark:text-night-200">
          <span v-if="timeLine">{{ timeLine }}</span>
          <span v-if="timeLine && props.item.room"> · </span>
          <span v-if="props.item.room">{{ t('Room {room}', { room: props.item.room }) }}</span>
          <span v-if="props.item.seat"> · {{ t('Seat {seat}', { seat: props.item.seat }) }}</span>
        </div>
        <div class="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold" :style="{ color: meta.color }">
          <Icon name="clock" :size="14" /> {{ countdown }}
        </div>
      </div>

      <!-- Reminder state -->
      <div class="flex items-center gap-2 text-xs">
        <Icon name="bell" :size="14" :class="props.item.reminder_at ? '' : 'opacity-40'" />
        <span v-if="props.item.reminder_at" class="text-night-600 dark:text-night-200">
          {{ t('Reminder set for {when}', { when: fmtDateTime(props.item.reminder_at) }) }}
        </span>
        <button v-else class="link" @click="emit('edit', props.item)">{{ t('Set a reminder') }}</button>
      </div>

      <!-- Team -->
      <div v-if="team.length" class="space-y-1.5">
        <p class="t-label">{{ t('Team') }}</p>
        <div class="flex flex-wrap gap-2">
          <span v-for="p in team" :key="p.id" class="inline-flex items-center gap-1.5 rounded-full bg-night-100 py-0.5 pl-0.5 pr-2.5 dark:bg-night-700">
            <Avatar :src="avatarUrl(p)" :name="p.full_name" size="sm" />
            <span class="text-[13px] text-night-700 dark:text-night-100">{{ p.full_name || t('Friend') }}</span>
          </span>
        </div>
      </div>

      <p v-if="props.item.notes" class="tile p-3 text-sm text-night-700 dark:text-night-100">{{ props.item.notes }}</p>
    </div>

    <template #footer>
      <Button v-if="props.item" variant="ghost" size="sm" @click="emit('edit', props.item)">
        <Icon name="edit" :size="14" /> {{ t('Edit') }}
      </Button>
      <div class="flex-1" />
      <Button v-if="props.item" variant="secondary" size="sm"
              @click="go(`/notes?new=1${subject ? '&subject=' + subject.id : ''}`)">
        <Icon name="notes" :size="14" /> {{ t('Add note') }}
      </Button>
      <Button v-if="project" size="sm" @click="go(`/projects/${project.id}`)">
        <Icon name="projects" :size="14" /> {{ t('Open project') }}
      </Button>
      <Button v-else-if="subject && props.item && props.item.type !== 'presentation'" size="sm" @click="go(`/study?subject=${subject.id}`)">
        <Icon name="play" :size="14" /> {{ t('Start study') }}
      </Button>
    </template>
  </Modal>
</template>
