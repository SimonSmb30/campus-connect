import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/db'
import { universities } from '@/db/schema'
import { eq } from 'drizzle-orm'

const MODEL = process.env.OPENAI_EVENT_MODEL ?? 'gpt-4.1-mini'

const CATEGORIES = ['Party', 'Vortrag', 'Workshop', 'Angebot', 'Sport', 'Ausstellung', 'Community'] as const

const EVENT_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Kurzer deutscher Event-Titel für einen Campus-Feed.',
    },
    category: {
      type: 'string',
      enum: CATEGORIES,
      description: 'Am besten passende CampusConnect-Kategorie.',
    },
    schedule_type: {
      type: 'string',
      enum: ['single', 'multi_day', 'recurring', 'ongoing'],
      description: 'single=einmaliges Event, multi_day=mehrere Tage am Stück, recurring=wiederkehrend (z.B. jeden Dienstag), ongoing=dauerhaftes Angebot ohne klares Ende.',
    },
    date: {
      type: 'string',
      description: 'Startdatum im ISO-Format YYYY-MM-DD. Leer wenn ongoing oder recurring ohne festen Start.',
    },
    end_date: {
      type: 'string',
      description: 'Letzter Tag bei mehrtägigen Events, ISO YYYY-MM-DD. Leer wenn eintägig oder wiederkehrend.',
    },
    start_time: {
      type: 'string',
      description: 'Startzeit im Format HH:MM oder leer wenn unbekannt. Bei mehrtägigen Events: tägliche Öffnungszeit.',
    },
    end_time: {
      type: 'string',
      description: 'Endzeit im Format HH:MM oder leer wenn unbekannt. Bei mehrtägigen Events: tägliche Schließzeit.',
    },
    recurrence_days: {
      type: 'array',
      items: { type: 'number' },
      description: 'Wochentage bei wiederkehrenden Events: 0=Montag, 1=Dienstag, 2=Mittwoch, 3=Donnerstag, 4=Freitag, 5=Samstag, 6=Sonntag. Leeres Array wenn nicht wiederkehrend.',
    },
    recurrence_until: {
      type: 'string',
      description: 'Enddatum der Wiederholungsreihe, ISO YYYY-MM-DD. Leer wenn unbegrenzt oder nicht wiederkehrend.',
    },
    location: {
      type: 'string',
      description: 'Den Ortstext EXAKT wie er in Bild oder Beschreibung steht kopieren — z.B. "Botzenweiler 42", "Mensa", "Club XY". Keine Interpretation, keine Geocodierung, keine Verbesserung. Der Server übernimmt die Geocodierung. Leer wenn kein Ort genannt.',
    },
    location_detail: {
      type: 'string',
      description: 'Nur Raum/Etage/interner Zusatz wenn der Ortstext beides enthält. Beispiel: "H-Gebäude, Raum H01107" → location: "H-Gebäude", location_detail: "Raum H01107". Leer wenn kein Raumzusatz vorhanden.',
    },
    description: {
      type: 'string',
      description: 'Ausformulierte deutsche Beschreibung, präzise und hilfreich.',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Extraktions-Konfidenz von 0 bis 1.',
    },
    source_notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Kurze Hinweise welche Details aus Bild, Audio oder unsicher sind.',
    },
  },
  required: ['title', 'category', 'schedule_type', 'date', 'end_date', 'start_time', 'end_time', 'recurrence_days', 'recurrence_until', 'location', 'location_detail', 'description', 'confidence', 'source_notes'],
  additionalProperties: false,
}

const SYSTEM_PROMPT = `You are an AI event extraction system for the Campus Connect app.

You receive:
1. An image (flyer, poster, screenshot, social media post, etc.)
2. Optional additional user text
3. System-provided university/campus context for the current feed

Your task:
Extract structured event information from the image and text.

IMPORTANT:
- Return ONLY valid JSON.
- Do not include markdown.
- Do not explain anything.
- Do not invent information that is not visible or clearly inferable.
- If information is unknown, use empty strings "" or empty arrays [].
- The output is only a suggestion and will later be editable by the user.
- Prefer information from the image over the user text if they conflict.
- Use German output text if possible.
- Never generate display strings.
- Never generate derived recurrence JSON.
- Never summarize.
- Never output comments outside the JSON.

--------------------------------------------------
CATEGORIES
--------------------------------------------------

Allowed category values:
- Party
- Vortrag
- Workshop
- Angebot
- Sport
- Ausstellung
- Community

Choose the single best fitting category.

--------------------------------------------------
SCHEDULE TYPES
--------------------------------------------------

Allowed schedule_type values:
- single
- multi_day
- recurring
- ongoing

Definitions:

single:
A one-time event on a specific date.

multi_day:
An event spanning multiple consecutive days.

recurring:
A repeating event such as:
- jeden Dienstag
- jeden Montag und Mittwoch
- weekly meetings
- recurring courses

ongoing:
Permanent or continuous offers without a clear schedule.

--------------------------------------------------
DATE RULES
--------------------------------------------------

Use ISO format: YYYY-MM-DD
Time format: HH:MM (24h)

Rules:
- Use empty strings instead of null.
- date = first event day (or first known occurrence for recurring, or empty if unknown)
- end_date = last event day for multi_day events only
- start_time / end_time apply to each day (for multi_day: daily opening/closing times)
- recurrence_days only for recurring events
- recurrence_until = optional end date for recurring events

Year inference:
If no year is visible, infer the nearest future date.
Today's year is 2026.
If the inferred month has already passed in 2026, use 2027.

Midnight overflow:
If an event ends after midnight (e.g. 22:00–02:00), set end_time to the actual end time (e.g. "02:00").
Do not add 24. end_date stays the start date.

recurrence_days uses numbers:
0 = Monday
1 = Tuesday
2 = Wednesday
3 = Thursday
4 = Friday
5 = Saturday
6 = Sunday

Weekday conversion examples:
- "jeden Dienstag" → [1]
- "Mo + Mi" → [0, 2]
- "every friday" → [4]
- "Tuesday + Thursday" → [1, 3]
- "Monday, Wednesday, Friday" → [0, 2, 4]

--------------------------------------------------
OUTPUT SCHEMA
--------------------------------------------------

Return EXACTLY this structure:

{
  "title": "",
  "category": "",
  "schedule_type": "",
  "date": "",
  "end_date": "",
  "start_time": "",
  "end_time": "",
  "recurrence_days": [],
  "recurrence_until": "",
  "location": "",
  "location_detail": "",
  "description": "",
  "confidence": 0.0,
  "source_notes": []
}

--------------------------------------------------
FIELD RULES
--------------------------------------------------

title:
Short event title in German if possible.

location:
Copy the location text EXACTLY as it appears in the image or user text. Do NOT geocode,
resolve, interpret, or improve it. Do NOT substitute the university's own address.
The server handles geocoding separately after extraction.

Examples:
- "Stattfinden tut das ganze in Botzenweiler 42"  → location: "Botzenweiler 42"
- "Party in der Mensa"                             → location: "Mensa"
- "Vortrag im H-Gebäude, Raum H01107"             → location: "H-Gebäude"
- "Club MAKE, K3"                                  → location: "Club MAKE"
- No location mentioned                            → location: ""

location_detail:
Only the room/floor/internal suffix when the location text contains both a venue AND a detail.
- "H-Gebäude, Raum H01107" → location_detail: "Raum H01107"
- "Club MAKE, K3"          → location_detail: "K3"
- "Botzenweiler 42"        → location_detail: ""
- "Mensa"                  → location_detail: ""

description:
A concise event description based only on visible information.

confidence:
A number between 0.0 and 1.0 representing overall extraction confidence.

source_notes:
Short internal notes about ambiguities or assumptions.
Examples:
- "Endzeit aus kleinem Text gelesen"
- "Datum schwer lesbar"
- "Ort nur teilweise sichtbar"
- "Jahr nicht angegeben, nächstes Vorkommen angenommen"
`.trim()

// POST /api/extract-event  → Foto + Text → Event-Daten (GPT-4.1-mini)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Nicht eingeloggt.' }, { status: 401 })
    }

    const body = await req.json()
    const { transcript, imageDataUrl } = body

    if (!transcript && !imageDataUrl) {
      return NextResponse.json({ ok: false, error: 'Kein Kontext oder Bild vorhanden.' }, { status: 400 })
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Hochschule aus DB laden (session enthält nur universityId, nicht den Namen)
    const [university] = await db
      .select({ name: universities.name, city: universities.city })
      .from(universities)
      .where(eq(universities.id, session.universityId))

    const universityName = university?.name ?? ''
    const cityName = university?.city ?? ''

    const campusContext = [
      universityName ? `Hochschule: ${universityName}` : '',
      cityName ? `Stadt: ${cityName}` : '',
    ].filter(Boolean).join('\n')

    const userContent = transcript
      ? `User context:\n${transcript}`
      : '(No additional user text provided. Extract from image only.)'

    const prompt = `${SYSTEM_PROMPT}\n\n--------------------------------------------------\nSYSTEM CAMPUS CONTEXT\n--------------------------------------------------\n\n${campusContext || '(Kein Hochschul-Kontext verfügbar.)'}\n\n--------------------------------------------------\nUSER INPUT\n--------------------------------------------------\n\n${userContent}`

    const content: OpenAI.Responses.ResponseInputContent[] = [
      { type: 'input_text', text: prompt },
    ]
    if (imageDataUrl) {
      content.push({ type: 'input_image', image_url: imageDataUrl, detail: 'auto' })
    }

    const response = await client.responses.create({
      model: MODEL,
      input: [{ role: 'user', content }],
      text: {
        format: {
          type: 'json_schema',
          name: 'campus_event',
          strict: true,
          schema: EVENT_SCHEMA,
        },
      },
    })

    const extracted = JSON.parse(response.output_text)

    // Geocode-Validation: zwei Nominatim-Suchen, KI wählt bestes Ergebnis
    let confirmedLocation = extracted.location ?? ''
    if (confirmedLocation.trim()) {
      try {
        const nmHeaders = {
          'User-Agent': 'CampusConnect/1.0 (campus-connect-app)',
          'Accept-Language': 'de',
        }
        // Suche 1: Beschreibungskontext – nur der extrahierte Rohtext
        const q1 = encodeURIComponent(confirmedLocation)
        // Suche 2: Campus-Kontext – Rohtext + Hochschule + Stadt
        const q2 = encodeURIComponent(`${confirmedLocation} ${universityName} ${cityName}`.trim())

        const [r1, r2] = await Promise.all([
          fetch(`https://nominatim.openstreetmap.org/search?q=${q1}&format=json&limit=5`, { headers: nmHeaders }),
          fetch(`https://nominatim.openstreetmap.org/search?q=${q2}&format=json&limit=5`, { headers: nmHeaders }),
        ])
        const [d1, d2]: { display_name: string }[][] = await Promise.all([r1.json(), r2.json()])

        // Ergebnisse zusammenführen, Duplikate entfernen
        const seen = new Set<string>()
        const candidates = [...d1, ...d2].filter(r => {
          if (seen.has(r.display_name)) return false
          seen.add(r.display_name)
          return true
        }).slice(0, 10)

        if (candidates.length > 0) {
          const pickPrompt = `Du hilfst beim Ermitteln des richtigen Veranstaltungsorts.

Event-Beschreibung: ${extracted.description || transcript || ''}
Campus-Kontext: ${campusContext || 'unbekannt'}
Extrahierter Ortstext: "${confirmedLocation}"

Geocoding-Kandidaten (echte OSM-Orte):
${candidates.map((c, i) => `${i + 1}. ${c.display_name}`).join('\n')}

Welche Nummer passt am besten zum tatsächlichen Veranstaltungsort? Antworte NUR mit der Zahl (z.B. "3") oder "0" wenn keiner passt.`

          const pickResp = await client.responses.create({
            model: MODEL,
            input: [{ role: 'user', content: [{ type: 'input_text', text: pickPrompt }] }],
          })
          const pick = parseInt(pickResp.output_text.trim(), 10)
          if (pick >= 1 && pick <= candidates.length) {
            confirmedLocation = candidates[pick - 1].display_name
          }
        }
      } catch {
        // Fallback: AI-extrahierter Wert bleibt erhalten
      }
    }

    // recurrence_rule aus recurrence_days + recurrence_until zusammenbauen
    const recurrenceRule = extracted.recurrence_days?.length
      ? JSON.stringify({
          type: 'weekly',
          days: extracted.recurrence_days,
          ...(extracted.recurrence_until ? { until: extracted.recurrence_until } : {}),
        })
      : null

    // display_text serverseitig generieren
    const { generateDisplayText } = await import('@/lib/event-time')
    const displayText = generateDisplayText({
      scheduleType: extracted.schedule_type,
      date: extracted.date,
      endDate: extracted.end_date,
      startTime: extracted.start_time,
      endTime: extracted.end_time,
      recurrenceRule,
    })

    return NextResponse.json({
      ok: true,
      transcript,
      event: {
        ...extracted,
        location: confirmedLocation,
        recurrence_rule: recurrenceRule,
        display_text: displayText,
      },
    })
  } catch (err) {
    console.error('Extract event error:', err)
    return NextResponse.json({ ok: false, error: 'KI-Extraktion fehlgeschlagen.' }, { status: 500 })
  }
}
