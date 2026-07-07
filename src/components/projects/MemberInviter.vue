<script setup lang="ts">
import { ref } from 'vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/composables/useToast'
import { useProjectsStore } from '@/stores/projects'

const props = defineProps<{ projectId: string }>()
const store = useProjectsStore()
const toast = useToast()

const q = ref('')
const results = ref<{ id: string; full_name: string | null; avatar_url: string | null }[]>([])
const searching = ref(false)

async function search() {
  if (q.value.trim().length < 2) { results.value = []; return }
  searching.value = true
  const { data, error } = await supabase.from('profiles')
    .select('id, full_name, avatar_url')
    .ilike('full_name', `%${q.value.trim()}%`)
    .limit(8)
  searching.value = false
  if (error) { toast.error('Search failed', error.message); return }
  results.value = (data ?? []) as any
}
async function invite(uid: string) {
  const { error } = await supabase.from('project_members').insert({ project_id: props.projectId, user_id: uid, role: 'member' })
  if (error) { toast.error('Could not invite', error.message); return }
  toast.success('Member added')
  results.value = results.value.filter(r => r.id !== uid)
  await store.loadDetail(props.projectId)
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-2">
      <Input v-model="q" placeholder="Search a friend by name…" @keydown.enter.prevent="search" />
      <Button variant="secondary" size="sm" :loading="searching" @click="search">Search</Button>
    </div>
    <ul v-if="results.length" class="space-y-1">
      <li v-for="r in results" :key="r.id" class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-night-50 dark:hover:bg-night-800">
        <Avatar :name="r.full_name" :src="null" size="sm" />
        <div class="text-sm flex-1">{{ r.full_name ?? 'Unknown' }}</div>
        <Button size="sm" @click="invite(r.id)">Add</Button>
      </li>
    </ul>
  </div>
</template>
