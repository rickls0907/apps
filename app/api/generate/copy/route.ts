export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are an expert Facebook and Instagram ad copywriter. Write high-converting ad copy.

CRITICAL: Always return valid JSON. Never ask questions. If context is limited, infer from the client name and write compelling copy. Always produce output.

RULES:
- Write AS the business (brand voice)
- No em dashes, no AI clichés ("game-changer", "revolutionize", "unlock")
- Hook first: the opening line must stop the scroll
- Primary text: 1-3 short paragraphs, benefit-driven, max 125 words
- Headline: 5-10 words, punchy, action-oriented, creates urgency or curiosity
- Description: 1 short sentence supporting the headline
- Suggest the most appropriate CTA from: learn_more, shop_now, sign_up, contact_us, get_offer, book_now, download, apply_now, get_quote, watch_more, subscribe, order_now
- Human, conversational, not corporate
- Each ad should have a different angle/hook from existing ads

Return ONLY valid JSON (no markdown, no code fences):
{"primary_text":"...","headline":"...","description":"...","cta":"learn_more"}`

export async function POST(req: NextRequest) {
  const { campaign_id, existing_text } = await req.json()
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

  const { data: campaign } = await supabase.from('ad_campaigns').select('*').eq('id', campaign_id).single()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const { data: client } = await supabase.from('ad_clients').select('*').eq('id', campaign.client_id).single()
  const { data: existing } = await supabase
    .from('ad_creatives')
    .select('primary_text, headline')
    .eq('campaign_id', campaign_id)
    .order('sort_order')

  let msg = `CLIENT: ${client?.name ?? campaign.client_name}\n`
  msg += `PLATFORM: ${campaign.platform}\nCAMPAIGN: ${campaign.name}\n\n`
  if (client?.site_context) msg += `BUSINESS PROFILE:\n${client.site_context}\n\n`
  if (campaign.strategy_notes) msg += `CAMPAIGN STRATEGY:\n${campaign.strategy_notes}\n\n`
  if (client?.strategy_notes) msg += `CLIENT STRATEGY NOTES:\n${client.strategy_notes}\n\n`

  const ctx = campaign.client_context as Record<string, string> | null
  if (ctx) {
    msg += 'CLIENT AD PREFERENCES:\n'
    for (const [k, v] of Object.entries(ctx)) {
      if (v) msg += `- ${k.replace(/_/g, ' ')}: ${v}\n`
    }
    msg += '\n'
  }

  if (existing?.length) {
    msg += 'EXISTING ADS (write something DIFFERENT):\n'
    for (const e of existing) {
      msg += `- Headline: ${e.headline} | Text: ${(e.primary_text ?? '').slice(0, 100)}\n`
    }
    msg += '\n'
  }

  msg += existing_text
    ? `CURRENT DRAFT TO IMPROVE:\n${existing_text}\n\nRewrite and improve the draft above.`
    : 'Write a new ad creative for this campaign.'

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: msg }],
    })

    const text = (response.content[0] as { text: string }).text.trim()
    // Strip code fences if present
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const data = JSON.parse(clean)

    return NextResponse.json({
      ok: true,
      primary_text: data.primary_text ?? '',
      headline: data.headline ?? '',
      description: data.description ?? '',
      cta: data.cta ?? 'learn_more',
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'AI error' }, { status: 500 })
  }
}
