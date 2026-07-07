<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/composables/useToast'
import Avatar from '@/components/ui/Avatar.vue'
import Button from '@/components/ui/Button.vue'
import Textarea from '@/components/ui/Textarea.vue'
import type { Comment, CommentTarget } from '@/types'

const props = defineProps<{ targetType: CommentTarget; targetId: string }>()
const toast = useToast()

interface CommentWithAuthor extends Comment {
  author?: { full_name: string | null; avatar_url: string | null } | null
}

const items = ref<CommentWithAuthor[]>([])
const body = ref('')
const loading = ref(false)
const posting = ref(false)

async function load() {
  loading.value = true
  const { data, error } = await supabase.from('comments')
    .select('*, author:profiles!comments_owner_id_fkey(full_name, avatar_url)')
    .eq('target_type', props.targetType)
    .eq('target_id', props.targetId)
    .order('created_at', { ascending: true })
  loading.value = false
  if (error) return
  items.value = (data ?? []) as any
}

async function post() {
  if (!body.value.trim()) return
  const { data: sess } = await supabase.auth.getSession()
  const owner_id = sess.session?.user.id!
  posting.value = true
  const { data, error } = await supabase.from('comments').insert({
    owner_id, target_type: props.targetType, target_id: props.targetId, body: body.value.trim(),
  }).select('*, author:profiles!comments_owner_id_fkey(full_name, avatar_url)').single()
  posting.value = false
  if (error) { toast.error('Could not post comment', error.message); return }
  items.value.push(data as any)
  body.value = ''
}

onMounted(load)
</script>

<template>
  <div class="space-y-3">
    <ul v-if="items.length" class="space-y-2">
      <li v-for="c in items" :key="c.id" class="flex items-start gap-2">
        <Avatar :name="c.author?.full_name" :src="null" size="sm" />
        <div class="rounded-2xl bg-night-50 dark:bg-night-800 border border-surface-border dark:border-night-700 px-3 py-2 max-w-full">
          <div class="text-[11px] text-night-500">{{ c.author?.full_name ?? 'Anonymous' }} · {{ new Date(c.created_at).toLocaleString() }}</div>
          <div class="text-sm whitespace-pre-wrap break-words">{{ c.body }}</div>
        </div>
      </li>
    </ul>
    <p v-else-if="!loading" class="text-xs text-night-500">No comments yet. Say something nice.</p>

    <div class="flex gap-2 items-start">
      <div class="flex-1"><Textarea v-model="body" :rows="2" placeholder="Add a comment…" /></div>
      <Button :loading="posting" @click="post">Post</Button>
    </div>
  </div>
</template>
