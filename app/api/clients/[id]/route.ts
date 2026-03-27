import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('ad_clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, website_url, facebook_url, instagram_url, strategy_notes, notify_emails, site_context } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined)           updates.name = name.trim()
  if (website_url !== undefined)    updates.website_url = website_url || null
  if (facebook_url !== undefined)   updates.facebook_url = facebook_url || null
  if (instagram_url !== undefined)  updates.instagram_url = instagram_url || null
  if (strategy_notes !== undefined) updates.strategy_notes = strategy_notes || null
  if (notify_emails !== undefined)  updates.notify_emails = notify_emails || null
  if (site_context !== undefined) {
    updates.site_context = site_context || null
    updates.site_context_fetched_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('ad_clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
