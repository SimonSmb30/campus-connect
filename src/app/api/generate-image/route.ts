import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSessionFromRequest } from '@/lib/auth'
import { Storage } from '@google-cloud/storage'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1'
const storage = new Storage()

async function saveGeneratedImage(filename: string, image: Buffer) {
  const bucketName = process.env.BUCKET_NAME ?? process.env.GCS_BUCKET_NAME
  if (bucketName) {
    const objectName = `uploads/generated/${filename}`
    await storage.bucket(bucketName).file(objectName).save(image, {
      contentType: 'image/png',
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    })
    return `https://storage.googleapis.com/${bucketName}/${objectName}`
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', 'generated')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, filename), image)
  return `/uploads/generated/${filename}`
}

async function craftImagePrompt(
  client: OpenAI,
  event: { title: string; category?: string; location?: string; date?: string; startTime?: string; endTime?: string; description?: string },
  transcript: string,
  imageDataUrl?: string,
): Promise<string> {
  const eventSummary = [
    `Title: ${event.title}`,
    event.category  ? `Category: ${event.category}` : null,
    event.location  ? `Location: ${event.location}` : null,
    event.date      ? `Date: ${event.date}` : null,
    (event.startTime || event.endTime)
      ? `Time: ${[event.startTime, event.endTime].filter(Boolean).join(' – ')}`
      : null,
    event.description ? `Description: ${event.description}` : null,
    transcript        ? `Additional context (voice note): ${transcript}` : null,
  ].filter(Boolean).join('\n')

  const systemPrompt = `You are an expert art director creating image generation prompts for a university campus events app.
Your task: craft a vivid, specific, photorealistic image generation prompt for a square (1:1) event cover image.

Rules:
- NO text, letters, numbers, logos, signs, or UI elements in the image
- NO identifiable real faces
- Focus on atmosphere, mood, colors, lighting, composition
- Be concrete and visual — mention specific colors, materials, lighting conditions, camera angle
- Max 3 sentences, dense with visual detail
- The image should feel like a high-quality editorial photograph or cinematic still`

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = []

  if (imageDataUrl) {
    userContent.push({
      type: 'text',
      text: `Here is the event flyer/photo the user uploaded. Extract the dominant colors, visual style, and mood from it to inform the generated image:\n\n${eventSummary}\n\nCraft a specific image generation prompt that captures this event's essence, incorporating the visual style from the uploaded image.`,
    })
    userContent.push({
      type: 'image_url',
      image_url: { url: imageDataUrl, detail: 'low' },
    })
  } else {
    userContent.push({
      type: 'text',
      text: `Event details:\n${eventSummary}\n\nCraft a specific image generation prompt that captures this event's essence and atmosphere.`,
    })
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 300,
    temperature: 0.8,
  })

  const craftedPrompt = completion.choices[0]?.message?.content?.trim() ?? ''

  return `${craftedPrompt}

Square 1:1 format. No text, no letters, no numbers, no logos, no signs, no UI elements. No identifiable human faces. Cinematic quality, high production value.`
}

// POST /api/generate-image  → Event-Daten + optionales Referenzfoto → KI-Titelbild (gpt-image-1)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Nicht eingeloggt.' }, { status: 401 })
    }

    const { event, context, imageDataUrl } = await req.json()

    if (!event?.title) {
      return NextResponse.json({ ok: false, error: 'Event-Daten fehlen.' }, { status: 400 })
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const prompt = await craftImagePrompt(client, event, context ?? '', imageDataUrl)

    const response = await client.images.generate({
      model: MODEL,
      prompt,
      size: '1024x1024',
      quality: 'medium',
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
