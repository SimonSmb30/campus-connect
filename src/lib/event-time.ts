/**
 * Zentrale Datum/Zeit-Formatierung für Events.
 * Unterstützt drei Fälle:
 *   1. Eintägig          (nur date)
 *   2. Mehrtägig         (date + endDate)
 *   3. Wiederkehrend     (recurrenceRule JSON)
 */

const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const WEEKDAYS_LONG  = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

export type RecurrenceRule = {
  type: 'weekly'
  days: number[]     // 0=Mo … 6=So
  until?: string     // ISO YYYY-MM-DD
}

function parseRule(raw: string | null | undefined): RecurrenceRule | null {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function fmtShortDate(iso: string): string {
  try {
    const d = new Date(iso + 'T12:00:00')  // Noon um Timezone-Verschiebungen zu vermeiden
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  } catch { return iso }
}

function fmtLongDate(iso: string): string {
  try {
    const d = new Date(iso + 'T12:00:00')
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

function fmtTime(start: string, end?: string | null): string {
  if (!start) return ''
  return end ? `${start}–${end} Uhr` : `${start} Uhr`
}

// ── Feed-Karte (kompakt) ─────────────────────────────────────────────────────

export function formatEventDateShort(event: {
  scheduleType?: string | null
  date?: string | null
  endDate?: string | null
  startTime?: string | null
  endTime?: string | null
  recurrenceRule?: string | null
  displayText?: string | null
}): string {
  // Vorgespeicherter Text hat Vorrang
  if (event.displayText) return event.displayText

  if (event.scheduleType === 'ongoing') return 'Dauerhaft verfügbar'

  const rule = parseRule(event.recurrenceRule)

  // Wiederkehrend
  if (rule?.type === 'weekly' && rule.days?.length) {
    const dayLabels = rule.days.map(d => WEEKDAYS_SHORT[d] ?? '').join(' & ')
    const time = fmtTime(event.startTime ?? '', event.endTime)
    return time ? `${dayLabels} · ${time}` : dayLabels
  }

  // Mehrtägig
  if (event.endDate && event.date) {
    const start = fmtShortDate(event.date)
    const end   = fmtShortDate(event.endDate)
    const time  = fmtTime(event.startTime ?? '', event.endTime)
    return time ? `${start}–${end} · ${time}` : `${start}–${end}`
  }

  // Eintägig (Fallback: roher Text wenn kein ISO-Datum)
  if (!event.date) return ''
  const d = new Date((event.date ?? '') + 'T12:00:00')
  const dateStr = isNaN(d.getTime()) ? event.date : fmtShortDate(event.date)
  const time = fmtTime(event.startTime ?? '', event.endTime)
  return time ? `${dateStr} · ${time}` : dateStr ?? ''
}

// ── Display-Text generieren (beim Speichern, server-seitig) ─────────────────

export function generateDisplayText(event: {
  scheduleType?: string | null
  date?: string | null
  endDate?: string | null
  startTime?: string | null
  endTime?: string | null
  recurrenceRule?: string | null
}): string {
  const type = event.scheduleType ?? 'single'

  if (type === 'ongoing') return 'Dauerhaft verfügbar'

  if (type === 'recurring') {
    const rule = parseRule(event.recurrenceRule)
    if (rule?.type === 'weekly' && rule.days?.length) {
      const dayLabels = rule.days.length === 1
        ? `Jeden ${WEEKDAYS_LONG[rule.days[0]]}`
        : rule.days.map(d => WEEKDAYS_SHORT[d] ?? '').join(' & ')
      const time = fmtTime(event.startTime ?? '', event.endTime)
      const until = rule.until ? ` (bis ${fmtShortDate(rule.until)})` : ''
      return time ? `${dayLabels} · ${time}${until}` : dayLabels + until
    }
    return 'Wiederkehrend'
  }

  if (type === 'multi_day' && event.date && event.endDate) {
    const start = fmtShortDate(event.date)
    const end   = fmtShortDate(event.endDate)
    const time  = event.startTime ? `tägl. ${fmtTime(event.startTime, event.endTime)}` : ''
    return time ? `${start}–${end} · ${time}` : `${start}–${end}`
  }

  // single (oder Fallback)
  if (!event.date) return ''
  const d = new Date((event.date) + 'T12:00:00')
  const dateStr = isNaN(d.getTime()) ? event.date : fmtShortDate(event.date)
  const time = fmtTime(event.startTime ?? '', event.endTime)
  return time ? `${dateStr} · ${time}` : (dateStr ?? '')
}

// ── Detail-Seite (ausführlich) ───────────────────────────────────────────────

export function formatEventDateLong(event: {
  scheduleType?: string | null
  date?: string | null
  endDate?: string | null
  startTime?: string | null
  endTime?: string | null
  recurrenceRule?: string | null
  displayText?: string | null
}): { dateLine: string; timeLine: string } {
  // Dauerangebot
  if (event.scheduleType === 'ongoing') {
    return { dateLine: 'Dauerhaft verfügbar', timeLine: fmtTime(event.startTime ?? '', event.endTime) }
  }

  const rule = parseRule(event.recurrenceRule)

  // Wiederkehrend
  if (rule?.type === 'weekly' && rule.days?.length) {
    const dayLabels = rule.days.length === 1
      ? `Jeden ${WEEKDAYS_LONG[rule.days[0]]}`
      : rule.days.map(d => WEEKDAYS_LONG[d] ?? '').join(' & ')
    const until = rule.until ? ` (bis ${fmtShortDate(rule.until)})` : ''
    return {
      dateLine: dayLabels + until,
      timeLine: fmtTime(event.startTime ?? '', event.endTime),
    }
  }

  // Mehrtägig
  if (event.endDate && event.date) {
    const startD = new Date((event.date ?? '') + 'T12:00:00')
    const endD   = new Date((event.endDate ?? '') + 'T12:00:00')
    // Wenn gleiches Jahr: "21. April – 23. April 2026"
    const startStr = isNaN(startD.getTime()) ? event.date
      : startD.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
    const endStr = isNaN(endD.getTime()) ? event.endDate
      : endD.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    return {
      dateLine: `${startStr} – ${endStr}`,
      timeLine: event.startTime ? `tägl. ${fmtTime(event.startTime, event.endTime)}` : '',
    }
  }

  // Eintägig
  const d = new Date((event.date ?? '') + 'T12:00:00')
  const dateLine = (!event.date || isNaN(d.getTime())) ? (event.date ?? '') : fmtLongDate(event.date)
  return {
    dateLine,
    timeLine: fmtTime(event.startTime ?? '', event.endTime),
  }
}
