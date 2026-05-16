import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSessionFromRequest } from '@/lib/auth'

const MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-mini-transcribe'

// POST /api/transcribe  → Audio → Text (Whisper)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Nicht eingeloggt.' }, { status: 401 })
    }

    const formData = await req.formData()
    const audio = formData.get('audio') as File | null

    if (!audio) {
      return NextResponse.json({ ok: false, error: 'Keine Audiodatei gefunden.' }, { status: 400 })
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const transcription = await client.audio.transcriptions.create({
      model: MODEL,
      file: audio,
      language: 'de',
    })

    const text = transcription.text.trim()
    if (!text) {
      return NextResponse.json({ ok: false, error: 'Keine Sprache erkannt. Bitte erneut aufnehmen.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, transcript: text })
  } catch (err) {
    console.error('Transcribe error:', err)
    return NextResponse.json({ ok: false, error: 'Transkription fehlgeschlagen.' }, { status: 500 })
  }
}
