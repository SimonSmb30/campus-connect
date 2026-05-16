import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSessionFromRequest } from '@/lib/auth'
import { Storage } from '@google-cloud/storage'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1'
const storage = new Storage()

const CATEGORY_MOODS: Record<string, string> = {
  Party:       'energetic nightclub atmosphere, colorful neon lights, dynamic crowd silhouettes, vibrant purple and pink gradients, laser beams',
  Vortrag:     'clean academic auditorium, warm spotlight on a podium, geometric abstract shapes, deep blue and gold tones, elegant',
  Workshop:    'creative workshop space, hands working with materials and tools, warm amber lighting, earthy industrial tones',
  Angebot:     'inviting modern campus space, soft natural light streaming through windows, fresh green and white palette, welcoming',
  Sport:       'dramatic motion blur, athletic silhouettes mid-action, bold orange and black contrast, sense of speed and explosive energy',
  Ausstellung: 'gallery white walls, dramatic spotlights illuminating abstract sculptures, sophisticated and minimal, muted palette with one bold accent color',
  Community:   'diverse people socializing outdoors on a sunny campus, golden hour light, warm inclusive atmosphere, laughter and connection',
}

async function saveGeneratedImage(filename: string, image: Buffer) {
  const bucketName = process.env.BUCKET_NAME ?? process.env.GCS_BUCKET_NAME
  if (bucketName) {
    const objectName = `uploads/generated/${filename}`
    await storage.bucket(bucketName).file(objectName).save(image, {
      contentType: 'image/png',
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
      },
    })
    return `https://storage.googleapis.com/${bucketName}/${objectName}`
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', 'generated')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, filename), image)
  return `/uploads/generated/${filename}`
}

// POST /api/generate-image  → Event-Daten → KI-Titelbild (gpt-image-1)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Nicht eingeloggt.' }, { status: 401 })
    }

    const { event, context } = await req.json()

    if (!event?.title) {
      return NextResponse.json({ ok: false, error: 'Event-Daten fehlen.' }, { status: 400 })
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const mood = CATEGORY_MOODS[event.category] ?? 'vibrant university campus atmosphere, modern and dynamic design'

    const prompt = `
A stunning square event cover image for a university campus app. No text, no letters, no numbers, no logos.

Visual style: cinematic, high-contrast, modern graphic design aesthetic. Bold composition. Looks like a professional event poster photograph — atmospheric, dramatic, and memorable.

Mood and setting: ${mood}

Event context: ${event.title}${event.description ? '. ' + event.description.slice(0, 120) : ''}

Requirements:
- Square 1:1 format, strong centered composition
- No identifiable real people's faces
- Absolutely no text, labels, signs, UI elements, dates, or times anywhere in the image
- Dramatic lighting, rich saturated colors, visually striking
- High production value, could be used as a social media event header
    `.trim()

    const response = await client.images.generate({
      model: MODEL,
      prompt,
      size: '1024x1024',
      quality: 'low',
      n: 1,
    })

    const item = response.data?.[0]

    if (!item?.b64_json && !item?.url) {
      throw new Error('Kein Bild aus der API erhalten.')
    }

    let imageUrl: string

    if (item.b64_json) {
      const filename = `${randomUUID()}.png`
      imageUrl = await saveGeneratedImage(filename, Buffer.from(item.b64_json, 'base64'))
    } else {
      imageUrl = item.url!
    }

    return NextResponse.json({ ok: true, imageUrl })
  } catch (err) {
    console.error('Generate image error:', err)
    return NextResponse.json({ ok: false, error: 'Bildgenerierung fehlgeschlagen.' }, { status: 500 })
  }
}
