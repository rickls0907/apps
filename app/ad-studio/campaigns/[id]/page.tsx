'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge, PlatformBadge } from '@/components/StatusBadge'
import { CTA_OPTIONS, AD_ORIENTATIONS } from '@/lib/constants'
import type { AdCampaign, AdCreative, Orientation, CtaOption } from '@/lib/types'

const ORIENTATIONS = Object.keys(AD_ORIENTATIONS) as Orientation[]

interface CreativeForm {
  primary_text: string
  headline: string
  description: string
  cta: CtaOption
  orientations: Orientation[]
  images: Record<string, string>
  image_prompts: Record<string, string>
}

const emptyForm = (): CreativeForm => ({
  primary_text: '', headline: '', description: '', cta: 'learn_more',
  orientations: ['1x1', '4x5'], images: {}, image_prompts: {},
})

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<AdCampaign | null>(null)
  const [creatives, setCreatives] = useState<AdCreative[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<CreativeForm>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<CreativeForm>(emptyForm())
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [genImages, setGenImages] = useState<Record<string, Record<string, boolean>>>({})
  const [prompts, setPrompts] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [reviewCopied, setReviewCopied] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}`)
    const data = await res.json()
    setCampaign(data.campaign)
    setCreatives(data.creatives ?? [])
  }, [id])

  useEffect(() => { load() }, [load])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function generateCopy(target: 'form' | string, existingText?: string) {
    const key = `copy-${target}`
    setGenerating(p => ({ ...p, [key]: true }))
    const res = await fetch('/api/generate/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: id, existing_text: existingText }),
    })
    const data = await res.json()
    if (data.ok) {
      if (target === 'form') {
        setForm(p => ({ ...p, primary_text: data.primary_text, headline: data.headline, description: data.description, cta: data.cta }))
      } else {
        setEditForm(p => ({ ...p, primary_text: data.primary_text, headline: data.headline, description: data.description, cta: data.cta }))
      }
    } else flash(`Copy error: ${data.error}`)
    setGenerating(p => ({ ...p, [key]: false }))
  }

  async function generateImagePrompts(target: 'form' | string) {
    const src = target === 'form' ? form : editForm
    const key = `prompt-${target}`
    setGenerating(p => ({ ...p, [key]: true }))
    const res = await fetch('/api/generate/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: id, primary_text: src.primary_text, headline: src.headline, orientations: src.orientations }),
    })
    const data = await res.json()
    if (data.ok) {
      const newPrompts: Record<string, string> = {}
      for (const [orient, prompt] of Object.entries(data.prompts as Record<string, string>)) {
        newPrompts[`${target}-${orient}`] = prompt
      }
      setPrompts(p => ({ ...p, ...newPrompts }))
    } else flash(`Prompt error: ${data.error}`)
    setGenerating(p => ({ ...p, [key]: false }))
  }

  async function generateImage(creativeId: string, orientation: Orientation) {
    const prompt = prompts[`${creativeId}-${orientation}`]
    if (!prompt) { flash('Generate image prompts first'); return }
    const key = `${creativeId}-${orientation}`
    setGenImages(p => ({ ...p, [creativeId]: { ...(p[creativeId] ?? {}), [orientation]: true } }))
    const res = await fetch('/api/generate/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, orientation, creative_id: creativeId === 'form' ? undefined : creativeId }),
    })
    const data = await res.json()
    if (data.ok) {
      if (creativeId === 'form') {
        setForm(p => ({ ...p, images: { ...p.images, [orientation]: data.url } }))
      } else {
        setEditForm(p => ({ ...p, images: { ...p.images, [orientation]: data.url } }))
      }
    } else flash(`Image error: ${data.error}`)
    setGenImages(p => ({ ...p, [creativeId]: { ...(p[creativeId] ?? {}), [orientation]: false } }))
  }

  async function saveCreative(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { flash('Creative added'); setForm(emptyForm()); setAddOpen(false); load() }
    else { const d = await res.json(); flash(`Error: ${d.error}`) }
    setSaving(false)
  }

  async function updateCreative(creativeId: string) {
    setSaving(true)
    const res = await fetch(`/api/creatives/${creativeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) { flash('Saved'); setEditingId(null); load() }
    else { const d = await res.json(); flash(`Error: ${d.error}`) }
    setSaving(false)
  }

  async function deleteCreative(creativeId: string) {
    if (!confirm('Delete this creative?')) return
    await fetch(`/api/creatives/${creativeId}`, { method: 'DELETE' })
    load()
  }

  async function updateStatus(status: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const reviewUrl = campaign ? `${window.location.origin}/review/${campaign.review_token}` : ''

  function copyReviewLink() {
    navigator.clipboard.writeText(reviewUrl)
    setReviewCopied(true)
    setTimeout(() => setReviewCopied(false), 2000)
  }

  function startEdit(cr: AdCreative) {
    setEditingId(cr.id)
    setEditForm({
      primary_text: cr.primary_text ?? '',
      headline: cr.headline ?? '',
      description: cr.description ?? '',
      cta: cr.cta,
      orientations: cr.orientations,
      images: cr.images ?? {},
      image_prompts: cr.image_prompts ?? {},
    })
  }

  if (!campaign) return <div className="min-h-screen bg-bg flex items-center justify-center text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-bg">
      <nav className="nav-bar">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/ad-studio/clients" className="text-gray-500 hover:text-gray-300">Ad Studio</Link>
          <span className="text-gray-700">/</span>
          <Link href={`/ad-studio/clients/${campaign.client_id}`} className="text-gray-500 hover:text-gray-300">{campaign.client_name}</Link>
          <span className="text-gray-700">/</span>
          <span className="text-white font-semibold">{campaign.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <PlatformBadge platform={campaign.platform} />
          <StatusBadge status={campaign.status} />
          <select
            className="input text-xs py-1 w-auto"
            value={campaign.status}
            onChange={e => updateStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="revision_requested">Revision Requested</option>
          </select>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {msg && <div className="bg-blue-900/30 border border-blue-800 text-blue-400 text-sm px-4 py-2 rounded-lg">{msg}</div>}

        {/* Review Link */}
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Client Review Link</p>
            <p className="text-sm text-gray-400 truncate max-w-xs">{reviewUrl}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="btn btn-sm btn-ghost" onClick={copyReviewLink}>
              {reviewCopied ? 'Copied!' : 'Copy Link'}
            </button>
            <a href={reviewUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">Open</a>
          </div>
        </div>

        {/* Strategy */}
        {campaign.strategy_notes && (
          <div className="card">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Campaign Strategy</p>
            <p className="text-sm text-gray-400 whitespace-pre-wrap">{campaign.strategy_notes}</p>
          </div>
        )}

        {/* Add Creative */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white text-lg">Creatives ({creatives.length})</h2>
            <button className="btn btn-blue" onClick={() => setAddOpen(!addOpen)}>+ Add Creative</button>
          </div>

          {addOpen && (
            <form onSubmit={saveCreative} className="card mb-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">New Creative</h3>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => generateCopy('form')} disabled={generating['copy-form']}>
                  {generating['copy-form'] ? 'Generating...' : '✦ Generate Copy'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Primary Text</label>
                  <textarea className="input" rows={4} value={form.primary_text} onChange={e => setForm(p => ({ ...p, primary_text: e.target.value }))} placeholder="Hook line and body copy..." />
                </div>
                <div>
                  <label className="label">Headline</label>
                  <input className="input" value={form.headline} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))} placeholder="5-10 words" />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Short supporting line" />
                </div>
                <div>
                  <label className="label">Call to Action</label>
                  <select className="input" value={form.cta} onChange={e => setForm(p => ({ ...p, cta: e.target.value as CtaOption }))}>
                    {Object.entries(CTA_OPTIONS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Orientations</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ORIENTATIONS.map(o => (
                      <label key={o} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="checkbox" checked={form.orientations.includes(o)}
                          onChange={e => setForm(p => ({ ...p, orientations: e.target.checked ? [...p.orientations, o] : p.orientations.filter(x => x !== o) }))} />
                        <span className="text-gray-400">{AD_ORIENTATIONS[o].label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Image generation */}
              {form.orientations.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="label">Images</label>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => generateImagePrompts('form')} disabled={generating['prompt-form']}>
                      {generating['prompt-form'] ? 'Generating...' : '✦ Generate Prompts'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.orientations.map(o => (
                      <div key={o} className="bg-bg border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500">{AD_ORIENTATIONS[o].label}</span>
                          {form.images[o] && <img src={form.images[o]} alt={o} className="h-8 w-8 object-cover rounded" />}
                        </div>
                        <input className="input text-xs mb-2" value={prompts[`form-${o}`] ?? ''} onChange={e => setPrompts(p => ({ ...p, [`form-${o}`]: e.target.value }))} placeholder="Image prompt..." />
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => generateImage('form', o)} disabled={genImages['form']?.[o]}>
                          {genImages['form']?.[o] ? 'Generating...' : '✦ Generate Image'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button type="submit" className="btn btn-blue" disabled={saving}>{saving ? 'Saving...' : 'Add Creative'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>

        {/* Creatives List */}
        {creatives.length === 0
          ? <div className="card text-center py-8 text-gray-500">No creatives yet. Add one above.</div>
          : creatives.map((cr, i) => (
            <div key={cr.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad #{i + 1}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={cr.status} />
                  <span className="badge bg-gray-800 text-gray-400">{CTA_OPTIONS[cr.cta]}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => editingId === cr.id ? setEditingId(null) : startEdit(cr)}>
                    {editingId === cr.id ? 'Cancel' : 'Edit'}
                  </button>
                  <button className="btn btn-sm btn-red" onClick={() => deleteCreative(cr.id)}>Delete</button>
                </div>
              </div>

              {editingId === cr.id ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => generateCopy(cr.id, editForm.primary_text)} disabled={generating[`copy-${cr.id}`]}>
                      {generating[`copy-${cr.id}`] ? 'Generating...' : '✦ Regenerate Copy'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="label">Primary Text</label>
                      <textarea className="input" rows={4} value={editForm.primary_text} onChange={e => setEditForm(p => ({ ...p, primary_text: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Headline</label>
                      <input className="input" value={editForm.headline} onChange={e => setEditForm(p => ({ ...p, headline: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <input className="input" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">CTA</label>
                      <select className="input" value={editForm.cta} onChange={e => setEditForm(p => ({ ...p, cta: e.target.value as CtaOption }))}>
                        {Object.entries(CTA_OPTIONS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input" value={cr.status} onChange={async e => {
                        await fetch(`/api/creatives/${cr.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: e.target.value }) })
                        load()
                      }}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="revision">Revision</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {/* Image section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label">Images</label>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => generateImagePrompts(cr.id)} disabled={generating[`prompt-${cr.id}`]}>
                        {generating[`prompt-${cr.id}`] ? 'Generating...' : '✦ Generate Prompts'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {editForm.orientations.map(o => (
                        <div key={o} className="bg-bg border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-500">{AD_ORIENTATIONS[o].label}</span>
                            {editForm.images[o] && <img src={editForm.images[o]} alt={o} className="h-10 w-10 object-cover rounded" />}
                          </div>
                          <input className="input text-xs mb-2" value={prompts[`${cr.id}-${o}`] ?? editForm.image_prompts[o] ?? ''} onChange={e => setPrompts(p => ({ ...p, [`${cr.id}-${o}`]: e.target.value }))} placeholder="Image prompt..." />
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => generateImage(cr.id, o)} disabled={genImages[cr.id]?.[o]}>
                            {genImages[cr.id]?.[o] ? 'Generating...' : '✦ Generate Image'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="btn btn-blue" onClick={() => updateCreative(cr.id)} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                    <button className="btn btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Primary Text</p>
                    <p className="text-gray-300 whitespace-pre-wrap">{cr.primary_text ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Headline</p>
                    <p className="text-white font-semibold">{cr.headline ?? '—'}</p>
                    {cr.description && <>
                      <p className="text-xs text-gray-500 uppercase font-semibold mt-3 mb-1">Description</p>
                      <p className="text-gray-400">{cr.description}</p>
                    </>}
                  </div>
                  {Object.keys(cr.images ?? {}).length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Images</p>
                      <div className="flex gap-3 flex-wrap">
                        {Object.entries(cr.images).map(([orient, url]) => (
                          <div key={orient} className="text-center">
                            <img src={url} alt={orient} className="h-20 w-20 object-cover rounded-lg border border-border" />
                            <p className="text-xs text-gray-600 mt-1">{orient}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="col-span-2 flex gap-2 text-xs text-gray-600">
                    {cr.client_feedback_count ? <span className="text-orange-400">{cr.client_feedback_count} client feedback</span> : null}
                    {cr.team_feedback_count ? <span className="text-blue-400">{cr.team_feedback_count} team notes</span> : null}
                  </div>
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  )
}
