// Small utility grab-bag. Kept dependency-free on purpose.

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAY_LONG   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const

export function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

// ---------- date/time ----------
/** Local calendar date as YYYY-MM-DD. Never use toISOString() for this —
 *  it converts to UTC and shifts the date for UTC+ timezones (we're UTC+7). */
export function localIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayIso(): string {
  return localIso(new Date())
}

export function fmtDate(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { month:'short', day:'numeric', year:'numeric' }) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d.includes('T') ? d : d + 'T00:00:00') : d
  return date.toLocaleDateString(undefined, opts)
}

export function fmtTime(t: string | null | undefined) {
  if (!t) return ''
  const [hStr, mStr] = t.split(':')
  const h = Number(hStr), m = Number(mStr)
  const d = new Date(); d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function weekdayNum(d: Date = new Date()) { return d.getDay() }

export function startOfWeek(d: Date = new Date()) {
  const x = new Date(d); x.setHours(0,0,0,0)
  const day = x.getDay()
  x.setDate(x.getDate() - day) // week starts Sunday
  return x
}
export function startOfMonth(d: Date = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
export function endOfMonth(d: Date = new Date()) {
  return new Date(d.getFullYear(), d.getMonth()+1, 0)
}

export function daysBetween(a: Date, b: Date) {
  const ms = 1000 * 60 * 60 * 24
  const A = new Date(a); A.setHours(0,0,0,0)
  const B = new Date(b); B.setHours(0,0,0,0)
  return Math.round((B.getTime() - A.getTime()) / ms)
}

export function humanCountdown(target: Date, now: Date = new Date()): string {
  let ms = target.getTime() - now.getTime()
  if (ms <= 0) return 'now'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

export function secondsToClock(total: number) {
  const s = Math.max(0, Math.floor(total))
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}

// ---------- misc ----------
export function initials(name?: string | null) {
  if (!name) return '·'
  return name.trim().split(/\s+/).slice(0,2).map(s => s[0]?.toUpperCase() ?? '').join('') || '·'
}

export function nanoid(size = 12) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  const arr = new Uint8Array(size)
  crypto.getRandomValues(arr)
  for (let i = 0; i < size; i++) out += alpha[arr[i] % alpha.length]
  return out
}

export function debounce<F extends (...args: any[]) => void>(fn: F, ms: number) {
  let t: any
  return (...args: Parameters<F>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

// ---------- image compression ----------
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b ?? file), 'image/webp', quality)
  )
  return blob
}

export async function imageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(blob)
  return { width: bmp.width, height: bmp.height }
}
