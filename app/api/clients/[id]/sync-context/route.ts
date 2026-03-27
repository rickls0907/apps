export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function scrapeUrl(url: string): Promise<string> {
  try {
    // Try direct fetch first
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SpredX/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    // Strip tags and collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text.length > 200) return text.slice(0, 8000)
  } catch {
    // fallthrough to Jina
  }

  // Fallback: Jina Reader (returns clean markdown, no API key needed)
  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const res = await fetch(jinaUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    })
    const text = await res.text()
    if (text.length > 100) return text.slice(0, 8000)
  } catch {
    throw new Error('Could not fetch website content')
  }

  throw new Error('No content retrieved from website')
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: client, error: clientErr } = await supabase
    .from('ad_clients')
    .select('website_url, name')
    .eq('id', id)
    .single()

  if (clientErr || !client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (!client.website_url) return NextResponse.json({ error: 'No website URL set' }, { status: 400 })

  try {
    const rawText = await scrapeUrl(client.website_url)

    // Ask Claude to summarise into a business profile
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Extract a concise business profile from this website content for ${client.name}. Include: what the business does, key services/products, target audience, tone/style, and any unique selling points. 300 words max, plain text only.\n\n${rawText}`,
      }],
    })

    const summary = (msg.content[0] as { text: string }).text.trim()

    const { data, error } = await supabase
      .from('ad_clients')
      .update({ site_context: summary, site_context_fetched_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, site_context: data.site_context })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
