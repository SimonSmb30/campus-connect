'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

type Category = 'Party' | 'Vortrag' | 'Workshop' | 'Angebot' | 'Sport' | 'Ausstellung' | 'Community'

const CATEGORIES: { label: Category }[] = [
  { label: 'Party' },
  { label: 'Vortrag' },
  { label: 'Workshop' },
  { label: 'Angebot' },
  { label: 'Sport' },
  { label: 'Ausstellung' },
  { label: 'Community' },
]

export default function PostPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)

  const [description, setDescription] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRef = useRef<any>(null)
  const finalTranscriptRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [category, setCategory] = useState<Category>('Community')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [locationDetail, setLocationDetail] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<{ display_name: string; place_id: number }[]>([])
  const [showMapPicker, setShowMapPicker] = useState(false)
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [desc, setDesc] = useState('')
  const [dateMode, setDateMode] = useState<'single' | 'multiday' | 'recurring' | 'ongoing'>('single')
  const [endDate, setEndDate] = useState('')
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([])
  const [recurrenceUntil, setRecurrenceUntil] = useState('')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [showImageActions, setShowImageActions] = useState(false)
  const [generationsLeft, setGenerationsLeft] = useState(1)
  const [adjustMode, setAdjustMode] = useState(false)
  const [imgScale, setImgScale] = useState(1)
  const [imgX, setImgX] = useState(0)
  const [imgY, setImgY] = useState(0)
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const [postError, setPostError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [aiError, setAiError] = useState('')

  const hasDescription = description.trim().length > 0

  const descriptionPrimaryLabel = recording
    ? 'Aufnahme beenden'
    : hasDescription
      ? 'Mit dieser Beschreibung fortfahren'
      : 'Aufnahme starten'

  function handleDescriptionPrimaryAction() {
    if (recording) {
      stopSpeechRecognition()
      return
    }

    if (hasDescription) {
      setStep(3)
      return
    }

    startSpeechRecognition()
  }

  useEffect(() => {
    if (step !== 3) return
    let cancelled = false

    async function extractEvent() {
      try {
        const res = await fetch('/api/extract-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: description, imageDataUrl }),
        })

        const data = await res.json()
        if (cancelled) return

        if (data.ok) {
          const e = data.event
          setCategory(e.category ?? 'Community')
          setTitle(e.title ?? '')
          setDate(e.date ?? '')
          setStartTime(e.start_time ?? '')
          setEndTime(e.end_time ?? '')
          setLocation(e.location ?? '')
          setLocationDetail(e.location_detail ?? '')
          setDesc(e.description ?? '')

          // Client-side Nominatim fallback: get full display_name if server returned raw text
          if (e.location) {
            fetch(`/api/geocode?q=${encodeURIComponent(e.location)}`)
              .then(r => r.json())
              .then((results: { display_name: string }[]) => {
                if (results.length > 0 && !cancelled) setLocation(results[0].display_name)
              })
              .catch(() => {})
          }

          if (e.schedule_type === 'ongoing') {
            setDateMode('ongoing')
          } else if (e.schedule_type === 'multi_day' || e.end_date) {
            setEndDate(e.end_date ?? '')
            setDateMode('multiday')
          } else if (e.schedule_type === 'recurring' || e.recurrence_days?.length) {
            setRecurrenceDays(e.recurrence_days ?? [])
            setRecurrenceUntil(e.recurrence_until ?? '')
            setDateMode('recurring')
          }
        } else {
          setAiError(data.error ?? 'KI-Extraktion fehlgeschlagen.')
        }
      } catch {
        if (!cancelled) setAiError('Netzwerkfehler bei der KI-Extraktion.')
      } finally {
        if (!cancelled) setStep(4)
      }
    }

    extractEvent()
    return () => {
      cancelled = true
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target?.result as string
      setImagePreview(url)
      setImageDataUrl(url)
    }
    reader.readAsDataURL(file)
  }

  function handleLocationInput(val: string) {
    setLocation(val)
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current)
    setLocationSuggestions([])
    if (val.length < 3) return
    locationDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`)
        const data = await res.json()
        setLocationSuggestions(data)
      } catch { /* ignore */ }
    }, 350)
  }

  function startSpeechRecognition() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) as any
    if (!SR) return

    finalTranscriptRef.current = description.trimEnd() ? description.trimEnd() + ' ' : ''
    const sr = new SR()
    sr.lang = 'de-DE'
    sr.continuous = true
    sr.interimResults = true

    sr.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += t + ' '
        } else {
          interim = t
        }
      }
      setDescription(finalTranscriptRef.current + interim)
    }

    sr.onend = () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setDescription(finalTranscriptRef.current.trim())
      setRecording(false)
      speechRef.current = null
    }

    sr.onerror = () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setRecording(false)
      speechRef.current = null
    }

    sr.start()
    speechRef.current = sr
    setRecordingTime(0)
    setRecording(true)

    timerRef.current = setInterval(() => {
      setRecordingTime(t => {
        if (t >= 59) {
          stopSpeechRecognition()
          return 60
        }
        return t + 1
      })
    }, 1000)
  }

  function stopSpeechRecognition() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    speechRef.current?.stop()
    // recording=false + timerRef cleanup happens in sr.onend / sr.onerror too
  }

  async function handleGenerateImage() {
    if (generationsLeft <= 0) return
    setShowImageActions(false)
    setGeneratingImage(true)
    setAiError('')

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: { title, category, location, date, description: desc },
          context: description,
        }),
      })

      const data = await res.json()
      if (data.ok) {
        setGeneratedImage(data.imageUrl)
        setGenerationsLeft(prev => Math.max(0, prev - 1))
        setImgScale(1); setImgX(0); setImgY(0)
      } else setAiError(data.error ?? 'Bildgenerierung fehlgeschlagen.')
    } catch (err) {
      console.error('Image generation error:', err)
      setAiError('Bildgenerierung fehlgeschlagen.')
    }

    setGeneratingImage(false)
  }

  async function handlePost() {
    if (posting) return

    setPosting(true)
    setPostError('')

    try {
      const finalImageUrl = generatedImage ?? imageDataUrl ?? null
      const scheduleTypeMap = {
        single: 'single',
        multiday: 'multi_day',
        recurring: 'recurring',
        ongoing: 'ongoing',
      } as const

      const scheduleType = scheduleTypeMap[dateMode]

      const recurrenceRule =
        dateMode === 'recurring' && recurrenceDays.length
          ? JSON.stringify({
              type: 'weekly',
              days: recurrenceDays,
              ...(recurrenceUntil ? { until: recurrenceUntil } : {}),
            })
          : null

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          date,
          startTime,
          endTime,
          location,
          locationDetail: locationDetail || undefined,
          description: desc,
          imageUrl: finalImageUrl,
          scheduleType,
          endDate: dateMode === 'multiday' && endDate ? endDate : null,
          recurrenceRule,
        }),
      })

      const data = await res.json()

      if (data.ok) {
        setPosted(true)
        setTimeout(() => router.push('/feed'), 1500)
      } else {
        setPostError(data.error ?? 'Event konnte nicht gepostet werden.')
        setPosting(false)
      }
    } catch {
      setPostError('Netzwerkfehler. Bitte versuche es erneut.')
      setPosting(false)
    }
  }

  const displayImage = generatedImage ?? imagePreview

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 flex h-14 items-center justify-between px-4 bg-white/80 backdrop-blur-sm">
        <button onClick={() => (step > 1 ? setStep(s => s === 4 ? 2 : s - 1) : router.back())}>
          {step > 1 ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <polyline points="15,18 9,12 15,6" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>

        <span className="font-semibold text-[#1A1F2E]">
          {step === 1 ? 'Event teilen' : step === 2 ? 'Event beschreiben' : step === 3 ? 'KI analysiert…' : 'Überprüfen'}
        </span>

        <div className="w-6" />
      </div>

      <div className="flex flex-1 flex-col pt-14 overflow-y-auto">
        {step !== 3 && (
          <div className="flex gap-1.5 px-4 pt-3 shrink-0">
            {[1, 2, 4].map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  (step === 4 ? 3 : step) >= i + 1 ? 'bg-[#F05A1E]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-1 flex-col px-4 pt-5 pb-10 gap-4">
            <div className="relative h-72 max-h-[58vh] rounded-3xl overflow-hidden">
              {imagePreview ? (
                <label className="cursor-pointer group relative h-full w-full block">
                  <img src={imagePreview} alt="Vorschau" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2" />
                      </svg>
                    </div>
                    <span className="text-white text-sm font-semibold">Foto ändern</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              ) : (
                <label className="cursor-pointer h-full w-full flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F05A1E]/10">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#F05A1E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="13" r="4" stroke="#F05A1E" strokeWidth="1.8" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-500">Foto aufnehmen / auswählen</p>
                    <p className="text-xs text-gray-400 mt-1">Flyer, Screenshot oder Foto</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              {imagePreview && (
                <button onClick={() => setStep(2)} className="w-full rounded-2xl bg-[#F05A1E] py-4 font-bold text-white text-base">
                  Mit diesem Foto fortfahren
                </button>
              )}

              <button onClick={() => setStep(2)} className="w-full rounded-2xl bg-gray-100 py-3.5 text-gray-500 font-semibold text-sm">
                Ohne Foto fortfahren
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-1 flex-col px-4 pt-6 pb-10">

            {/* Card: Textarea + Mic-Button */}
            <div className={`relative flex-1 flex flex-col rounded-2xl border transition-colors min-h-0 ${
              recording ? 'border-[#F05A1E]' : 'border-gray-200'
            } bg-white overflow-hidden`}>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="z.B. Sommerfest am Freitag um 20 Uhr, Gebäude A, mit DJ und Getränken…"
                className="flex-1 w-full px-4 pt-4 pb-14 text-sm text-[#1A1F2E] placeholder-gray-400 outline-none resize-none bg-transparent"
              />
              {/* Countdown bottom-left */}
              {recording && (
                <div className="absolute bottom-3 left-4 flex items-center gap-1.5 pointer-events-none">
                  <div className="h-2 w-2 rounded-full bg-[#F05A1E] animate-pulse" />
                  <span className="text-xs text-[#F05A1E] font-medium tabular-nums">
                    {Math.max(0, 60 - recordingTime)}s
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={handleDescriptionPrimaryAction}
                className="w-full rounded-2xl bg-[#F05A1E] py-4 font-bold text-white text-base"
              >
                {descriptionPrimaryLabel}
              </button>
              <button
                onClick={() => setStep(imageDataUrl ? 3 : 4)}
                className="w-full rounded-2xl bg-gray-100 py-3.5 text-gray-500 font-semibold text-sm"
              >
                Ohne Beschreibung fortfahren
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="#F05A1E" strokeWidth="2" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg text-[#1A1F2E]">KI analysiert dein Event</p>
              <p className="text-sm text-gray-400 mt-1">Titel, Datum, Ort und Kategorie werden erkannt…</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-1 flex-col px-4 pt-5 pb-10 gap-5 overflow-y-auto">
            {aiError && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-500">
                {aiError} – Bitte Felder manuell ausfüllen.
              </div>
            )}

            {/* Titelbild-Rahmen */}
            {displayImage ? (
              <div className="relative h-52 rounded-3xl overflow-hidden shrink-0">
                <img
                  src={displayImage}
                  alt="Titelbild"
                  draggable={false}
                  className={`h-full w-full object-cover select-none transition-opacity ${generatingImage ? 'opacity-50' : ''}`}
                  style={{ transform: `scale(${imgScale}) translate(${imgX}px, ${imgY}px)`, transformOrigin: 'center' }}
                />

                {/* Generierungsspinner */}
                {generatingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                  </div>
                )}

                {/* Anpassen-Mode Overlay */}
                {adjustMode && !generatingImage && (
                  <div
                    className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
                    onPointerDown={e => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: imgX, baseY: imgY }
                    }}
                    onPointerMove={e => {
                      if (!dragRef.current) return
                      setImgX(dragRef.current.baseX + (e.clientX - dragRef.current.startX) / imgScale)
                      setImgY(dragRef.current.baseY + (e.clientY - dragRef.current.startY) / imgScale)
                    }}
                    onPointerUp={() => { dragRef.current = null }}
                    onPointerCancel={() => { dragRef.current = null }}
                  >
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-4 pb-4 pt-3 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                          <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
                          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input
                          type="range" min="1" max="3" step="0.05"
                          value={imgScale}
                          onChange={e => setImgScale(Number(e.target.value))}
                          className="flex-1 accent-white h-1"
                          onPointerDown={e => e.stopPropagation()}
                        />
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                          <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2" />
                          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                      <button
                        onClick={() => setAdjustMode(false)}
                        className="w-full rounded-2xl bg-white py-2.5 text-sm font-semibold text-[#1A1F2E]"
                      >
                        Fertig
                      </button>
                    </div>
                  </div>
                )}

                {/* Bearbeiten-Button */}
                {!adjustMode && !generatingImage && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent pb-4 pt-8 flex justify-center">
                    <button
                      onClick={() => setShowImageActions(true)}
                      className="flex items-center gap-1.5 rounded-full bg-white/25 backdrop-blur-sm border border-white/30 px-5 py-2 text-sm font-semibold text-white"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Bearbeiten
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-gray-300 bg-gray-100 flex flex-col items-center justify-center gap-4 py-10 shrink-0">
                {generatingImage ? (
                  <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin h-8 w-8 text-[#F05A1E]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    <p className="text-sm text-gray-400">Bild wird generiert…</p>
                  </div>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F05A1E]/10">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#F05A1E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="13" r="4" stroke="#F05A1E" strokeWidth="1.8" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Titelbild hinzufügen</p>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1.5 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 cursor-pointer font-medium">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <polyline points="17,8 12,3 7,8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="12" y1="3" x2="12" y2="15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Hochladen
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>
                      <button
                        onClick={handleGenerateImage}
                        disabled={generationsLeft === 0}
                        className={`flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-medium ${generationsLeft > 0 ? 'bg-[#F05A1E] text-white' : 'bg-gray-200 text-gray-400'}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Generieren ({generationsLeft})
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Titel</p>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-[#1A1F2E] outline-none focus:border-[#F05A1E]" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Kategorie</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.label}
                    onClick={() => setCategory(c.label)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                      category === c.label ? 'bg-[#F05A1E] border-[#F05A1E] text-white' : 'bg-white border-gray-200 text-[#1A1F2E]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Beschreibung</p>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-[#1A1F2E] outline-none focus:border-[#F05A1E] resize-none" />
            </div>

            {/* Wiederholung */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Wiederholung</p>
              <div className="relative">
                <select
                  value={dateMode}
                  onChange={e => setDateMode(e.target.value as typeof dateMode)}
                  className="w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-[#1A1F2E] outline-none focus:border-[#F05A1E]"
                >
                  <option value="single">Eintägig</option>
                  <option value="multiday">Mehrtägig</option>
                  <option value="recurring">Wiederkehrend</option>
                  <option value="ongoing">Dauerhaft</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <polyline points="6,9 12,15 18,9" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Zeiteinstellungen */}
            <div className="flex flex-col gap-3">
              {dateMode !== 'ongoing' && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    {dateMode === 'recurring' ? 'Erster Termin (optional)' : 'Datum'}
                  </p>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-[#1A1F2E] outline-none focus:border-[#F05A1E]"
                  />
                </div>
              )}

              {dateMode === 'multiday' && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Letzter Tag</p>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-[#1A1F2E] outline-none focus:border-[#F05A1E]"
                  />
                </div>
              )}

              {dateMode === 'recurring' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Wochentage</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            setRecurrenceDays(prev =>
                              prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i].sort()
                            )
                          }
                          className={`h-9 w-9 rounded-full text-xs font-semibold border transition-colors ${
                            recurrenceDays.includes(i) ? 'bg-[#F05A1E] border-[#F05A1E] text-white' : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Bis (optional)</p>
                    <input
                      type="date"
                      value={recurrenceUntil}
                      onChange={e => setRecurrenceUntil(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-[#1A1F2E] outline-none focus:border-[#F05A1E]"
                    />
                  </div>
                </div>
              )}

              {dateMode !== 'ongoing' &&
                [
                  { label: 'Startzeit', value: startTime, set: setStartTime, hint: 'HH:MM' },
                  { label: 'Endzeit', value: endTime, set: setEndTime, hint: 'HH:MM (optional)' },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{f.label}</p>
                    <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.hint} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-[#1A1F2E] outline-none focus:border-[#F05A1E]" />
                  </div>
                ))}
            </div>

            {/* Ort */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Adresse / Ort</p>
              <div className="relative">
                <input
                  value={location}
                  onChange={e => handleLocationInput(e.target.value)}
                  onBlur={() => setTimeout(() => setLocationSuggestions([]), 200)}
                  placeholder="z.B. TU München, München"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-[#1A1F2E] outline-none focus:border-[#F05A1E]"
                />
                {locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    {locationSuggestions.map((s) => (
                      <button
                        key={s.place_id}
                        onMouseDown={() => { setLocation(s.display_name); setLocationSuggestions([]) }}
                        className="w-full text-left px-4 py-3 text-sm text-[#1A1F2E] hover:bg-gray-50 border-b border-gray-100 last:border-0 truncate"
                      >
                        {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="flex items-center gap-1 text-xs text-gray-400 mt-1.5 pl-1"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#9CA3AF" strokeWidth="2" />
                  <circle cx="12" cy="10" r="3" stroke="#9CA3AF" strokeWidth="2" />
                </svg>
                Auf Karte auswählen
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Raum / Details</p>
              <input
                value={locationDetail}
                onChange={e => setLocationDetail(e.target.value)}
                placeholder="z.B. H-Gebäude, Raum H01107"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-[#1A1F2E] outline-none focus:border-[#F05A1E]"
              />
            </div>

            {postError && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-500">
                {postError}
              </div>
            )}

            <button
              onClick={() => setShowPreview(true)}
              disabled={!title}
              className={`w-full rounded-2xl py-3.5 font-semibold text-base border transition-colors ${
                title ? 'border-[#F05A1E] text-[#F05A1E]' : 'border-gray-200 text-gray-300'
              }`}
            >
              Vorschau ansehen
            </button>

            <button
              onClick={handlePost}
              disabled={posting || !title}
              className={`w-full rounded-2xl py-4 font-bold text-white text-base transition-colors ${
                title && !posting ? 'bg-[#F05A1E]' : 'bg-gray-200'
              }`}
            >
              {posting ? 'Wird gepostet…' : 'Event posten'}
            </button>
          </div>
        )}
      </div>

      {/* Action Sheet – Titelbild bearbeiten */}
      {showImageActions && (
        <div
          className="fixed inset-0 z-[200] bg-black/40"
          onClick={() => setShowImageActions(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-4 pt-3 pb-10 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-300" />

            {/* Anpassen */}
            <button
              onClick={() => { setAdjustMode(true); setShowImageActions(false) }}
              className="flex items-center gap-4 w-full px-2 py-4 border-b border-gray-100"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M12 3v18M3 12h18" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#1A1F2E]">Anpassen</p>
                <p className="text-xs text-gray-400">Zoom und Position bearbeiten</p>
              </div>
            </button>

            {/* Hochladen */}
            <label className="flex items-center gap-4 w-full px-2 py-4 border-b border-gray-100 cursor-pointer">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" stroke="#1A1F2E" strokeWidth="2" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#1A1F2E]">Hochladen</p>
                <p className="text-xs text-gray-400">Foto aufnehmen oder aus Galerie</p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { handleImageChange(e); setShowImageActions(false) }}
              />
            </label>

            {/* Generieren */}
            <button
              onClick={handleGenerateImage}
              disabled={generationsLeft === 0 || generatingImage}
              className={`flex items-center gap-4 w-full px-2 py-4 ${generationsLeft === 0 ? 'opacity-40' : ''}`}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-full shrink-0 ${generationsLeft > 0 ? 'bg-[#F05A1E]/10' : 'bg-gray-100'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={generationsLeft > 0 ? '#F05A1E' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-[#1A1F2E] flex items-center gap-2">
                  Generieren
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${generationsLeft > 0 ? 'bg-[#F05A1E] text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {generationsLeft}
                  </span>
                </p>
                <p className="text-xs text-gray-400">
                  {generationsLeft > 0 ? 'KI erstellt ein Titelbild' : 'Limit erreicht'}
                </p>
              </div>
            </button>

            <button
              onClick={() => setShowImageActions(false)}
              className="mt-3 w-full rounded-2xl bg-gray-100 py-4 text-sm font-semibold text-gray-500"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {showMapPicker && (
        <MapPicker
          onSelect={(address) => { setLocation(address); setShowMapPicker(false) }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={() => setShowPreview(false)}>
          <div className="mt-auto mx-4 mb-6 rounded-3xl bg-white overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-[#1A1F2E]">Vorschau</span>
              <button onClick={() => setShowPreview(false)}>✕</button>
            </div>

            <div className="p-4">
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {(generatedImage ?? imagePreview) && (
                  <img src={generatedImage ?? imagePreview!} alt="Titelbild" className="w-full h-40 object-cover" />
                )}

                <div className="p-4 flex flex-col gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white w-fit"
                    style={{
                      backgroundColor: {
                        Party: '#7C3AED',
                        Vortrag: '#92400E',
                        Workshop: '#1E40AF',
                        Angebot: '#065F46',
                        Sport: '#991B1B',
                        Ausstellung: '#9D174D',
                        Community: '#C2410C',
                      }[category],
                    }}
                  >
                    {category}
                  </span>

                  <p className="font-bold text-[#1A1F2E] text-base leading-snug">{title}</p>
                  {desc && <p className="text-sm text-gray-500 line-clamp-2">{desc}</p>}

                  <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                    {date && <span>📅 {date}</span>}
                    {startTime && <span>🕐 {startTime}{endTime ? ` – ${endTime}` : ''}</span>}
                    {location && <span>📍 {location}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 pb-5">
              <button onClick={() => { setShowPreview(false); handlePost() }} disabled={posting} className="w-full rounded-2xl bg-[#F05A1E] py-4 font-bold text-white text-base">
                {posting ? 'Wird gepostet…' : 'Jetzt posten'}
              </button>
            </div>
          </div>
        </div>
      )}

      {posted && (
        <div className="fixed bottom-8 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl bg-[#1A1F2E] px-5 py-4 shadow-xl">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500">✓</div>
          <span className="font-medium text-white">Event wurde geteilt!</span>
        </div>
      )}
    </div>
  )
}