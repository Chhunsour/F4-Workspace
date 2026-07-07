import { onMounted, ref } from 'vue'

/** Standard view-level fetch wrapper: loading + error + retry.
 *  Failed fetches used to look like empty data; this makes them visible. */
export function useLoad(fn: () => Promise<unknown>) {
  const error = ref('')
  const loading = ref(true)
  async function load() {
    error.value = ''
    loading.value = true
    try { await fn() }
    catch (e: any) { error.value = e?.message ?? 'Something went wrong' }
    finally { loading.value = false }
  }
  onMounted(load)
  return { error, loading, load }
}
