export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ORIENT_DESCS: Record<string, string> = {
  '1x1':  '1:1 Square (1080x1080) — Facebook/Instagram feed. Centered subject, balanced composition.',
  '4x5':  '4:5 Portrait (1080x1350) — Instagram feed. Slightly taller frame, vertical emphasis.',
  '9x16': '9:16 Vertical (1080x1920) — Stories & Reels. Full vertical, subject fills height.',
  '16x9': '16:9 Landscape (1920x1080) — Facebook in-stream. Wide shot, horizontal emphasis.',
}

const SYSTEM = `You are an expert at writing image generation prompts for advertising creatives.

RULES:
- Create a visually compelling scene that supports the ad message
- NO text, NO logos, NO watermarks, NO words in the image
- Include: subject, setting, lighting, mood, color palette, camera angle
- 50-100 words per prompt
- Premium, professional, scroll-stopping
- Adapt composition for each orientation's aspect ratio

Return ONLY valid JSON (no markdown, no code fences):
{"base_concept":"Brief overall visual concept","prompts":{"1x1":"...","4x5":"..."}}`

export async function POST(req: NextRequest) {
  const { campaign_id, primary_text, headline, orientations } = await req.json()
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

  const { data: campaign } = await supabase.from('ad_campaigns').select('*').eq('id', campaign_id).single()
  const { data: client } = await supabase.from('ad_clients').select('*').eq('id', campaign?.client_id).single()

  let msg = `CLIENT: ${client?.name ?? campaign?.client_name}\n`
  msg += `CAMPAIGN: ${campaign?.name}\nPLATFORM: ${campaign?.platform}\n\n`
  if (primary_text) msg += `AD PRIMARY TEXT:\n${primary_text}\n\n`
  if (headline) msg += `AD HEADLINE: ${headline}\n\n`
  if (client?.site_context) msg += `BUSINESS PROFILE:\n${client.site_context}\n\n`
  if (campaign?.strategy_notes) msg += `CAMPAIGN STRATEGY:\n${campaign.strategy_notes}\n\n`

  const ctx = campaign?.client_context as Record<string, string> | null
  if (ctx) {
    for (const key of ['image_preferences', 'brand_style', 'brand_colors']) {
      if (ctx[key]) msg += `${key.replace(/_/g, ' ').toUpperCase()}: ${ctx[key]}\n`
    }
    msg += '\n'
  }

  msg += 'REQUESTED ORIENTATIONS:\n'
  for (const o of (orientations ?? ['1x1'])) {
    msg += `- ${o}: ${ORIENT_DESCS[o] ?? o}\n`
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: msg }],
    })

    const text = (response.content[0] as { text: string }).text.trim()
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const data = JSON.parse(clean)
    return NextResponse.json({ ok: true, base_concept: data.base_concept ?? '', prompts: data.prompts ?? {} })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'AI error' }, { status: 500 })
  }
}
