export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { uploadImage } from '@/lib/supabase'

const ASPECT_MAP: Record<string, string> = {
  '1x1': '1:1', '4x5': '4:5', '9x16': '9:16', '16x9': '16:9',
}

export async function POST(req: NextRequest) {
  const { prompt, orientation = '1x1', ref_images, creative_id } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })

  const geminiAspect = ASPECT_MAP[orientation] ?? '1:1'
  const apiKey = process.env.GEMINI_API_KEY
  const model  = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-preview-image-generation'
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  // Build parts — reference images first, then prompt
  const parts: unknown[] = []
  if (Array.isArray(ref_images)) {
    for (const img of ref_images) {
      if (img.base64) parts.push({ inlineData: { mimeType: img.mime ?? 'image/png', data: img.base64 } })
    }
  }
  parts.push({ text: prompt })

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { aspectRatio: geminiAspect },
    },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error.message ?? 'Gemini API error')

    const candidates = data.candidates ?? []
    if (!candidates.length) throw new Error('No candidates in Gemini response')

    let imageData: string | null = null
    let mimeType = 'image/png'

    for (const part of candidates[0].content?.parts ?? []) {
      const inline = part.inlineData ?? part.inline_data
      if (inline?.data) { imageData = inline.data; mimeType = inline.mimeType ?? inline.mime_type ?? 'image/png'; break }
    }

    if (!imageData) throw new Error('No image data in Gemini response')

    const buffer = Buffer.from(imageData, 'base64')
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const path = `${creative_id ?? 'tmp'}/${orientation}-${Date.now()}.${ext}`

    const publicUrl = await uploadImage('ad-images', path, buffer, mimeType)
    return NextResponse.json({ ok: true, url: publicUrl, orientation })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Image generation failed' }, { status: 500 })
  }
}
