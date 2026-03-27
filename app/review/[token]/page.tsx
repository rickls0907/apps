'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CTA_OPTIONS } from '@/lib/constants'
import type { AdCampaign, AdCreative, AdFeedback, ClientContext } from '@/lib/types'

type PreviewTab = 'fb-feed' | 'ig-feed' | 'story' | 'all'

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>()
  const [campaign, setCampaign] = useState<AdCampaign | null>(null)
  const [creatives, setCreatives] = useState<AdCreative[]>([])
  const [feedback, setFeedback] = useState<Record<string, AdFeedback[]>>({})
  const [activeTabs, setActiveTabs] = useState<Record<string, PreviewTab>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({})
  const [noteText, setNoteText] = useState<Record<string, string>>({})
  const [noteAuthor, setNoteAuthor] = useState<Record<string, string>>({})
  const [noteTarget, setNoteTarget] = useState<Record<string, string>>({})
  const [context, setContext] = useState<ClientContext>({})
  const [contextSaving, setContextSaving] = useState(false)
  const [contextMsg, setContextMsg] = useState('')
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/review?token=${token}`)
    if (!res.ok) { setNotFound(true); return }
    const data = await res.json()
    setCampaign(data.campaign)
    setCreatives(data.creatives)
    setFeedback(data.feedback)
    if (data.campaign?.client_context) setContext(data.campaign.client_context)
    // Init tabs
    const tabs: Record<string, PreviewTab> = {}
    for (const cr of data.creatives) tabs[cr.id] = 'fb-feed'
    setActiveTabs(tabs)
  }, [token])

  useEffect(() => { load() }, [load])

  async function submitFeedback(creativeId: string, type: string, note?: string, target = 'general') {
    const author = prompt('Your name:')
    if (!author) return
    if (type === 'revision' && !note) {
      const rev = prompt('What changes would you like?')
      if (!rev) return
      note = rev
    }
    setSubmitting(p => ({ ...p, [creativeId]: true }))
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, creative_id: creativeId, feedback_type: type, author_name: author, note_text: note, feedback_target: target }),
    })
    setSubmitting(p => ({ ...p, [creativeId]: false }))
    load()
  }

  async function submitNote(creativeId: string) {
    const author = noteAuthor[creativeId] || 'Client'
    const text = noteText[creativeId]
    if (!text) return
    setSubmitting(p => ({ ...p, [creativeId]: true }))
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, creative_id: creativeId, feedback_type: 'note', author_name: author, note_text: text, feedback_target: noteTarget[creativeId] ?? 'general' }),
    })
    setNoteText(p => ({ ...p, [creativeId]: '' }))
    setNoteOpen(p => ({ ...p, [creativeId]: false }))
    setSubmitting(p => ({ ...p, [creativeId]: false }))
    load()
  }

  async function saveContext() {
    setContextSaving(true)
    await fetch('/api/client-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, context }),
    })
    setContextMsg('Preferences saved!')
    setContextSaving(false)
    setTimeout(() => setContextMsg(''), 3000)
  }

  if (notFound) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center"><h1 className="text-2xl font-bold text-white mb-2">Not Found</h1><p className="text-gray-500">This review link is invalid or has expired.</p></div>
    </div>
  )

  if (!campaign) return <div className="min-h-screen bg-bg flex items-center justify-center text-gray-500">Loading...</div>

  const initials = campaign.client_name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center pb-8 mb-8 border-b border-border">
          <div className="inline-block bg-blue-900/30 text-blue-400 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-3">Ad Creative Review</div>
          <h1 className="text-3xl font-bold text-white mb-2">{campaign.client_name}</h1>
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500 flex-wrap">
            <span>{campaign.name}</span>
            <span className="text-gray-700">·</span>
            <span>{campaign.platform === 'both' ? 'Facebook + Instagram' : campaign.platform}</span>
          </div>
        </div>

        {creatives.length === 0 && (
          <div className="card text-center py-12 text-gray-500">No ad creatives have been added yet.</div>
        )}

        {creatives.map((cr, i) => {
          const imgs = cr.images ?? {}
          const feedItems = feedback[cr.id] ?? []
          const tab = activeTabs[cr.id] ?? 'fb-feed'
          const feedImg = imgs['4x5'] ?? imgs['1x1'] ?? ''
          const storyImg = imgs['9x16'] ?? ''

          return (
            <div key={cr.id} className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ad #{i + 1}</span>
                <div className="flex gap-2">
                  {cr.status === 'approved' && <span className="badge bg-green-900/50 text-green-400">Approved</span>}
                  {cr.status === 'revision' && <span className="badge bg-orange-900/50 text-orange-400">Revision Requested</span>}
                  <span className="badge bg-gray-800 text-gray-400">{CTA_OPTIONS[cr.cta]}</span>
                </div>
              </div>

              {/* Preview Tabs */}
              <div className="flex border-b border-border mb-4 gap-0 overflow-x-auto">
                {(cr.orientations?.includes('1x1') || cr.orientations?.includes('4x5')) && (
                  <>
                    <button onClick={() => setActiveTabs(p => ({ ...p, [cr.id]: 'fb-feed' }))} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'fb-feed' ? 'text-blue-400 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Facebook Feed</button>
                    <button onClick={() => setActiveTabs(p => ({ ...p, [cr.id]: 'ig-feed' }))} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'ig-feed' ? 'text-blue-400 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Instagram Feed</button>
                  </>
                )}
                {cr.orientations?.includes('9x16') && (
                  <button onClick={() => setActiveTabs(p => ({ ...p, [cr.id]: 'story' }))} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'story' ? 'text-blue-400 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Story / Reel</button>
                )}
                <button onClick={() => setActiveTabs(p => ({ ...p, [cr.id]: 'all' }))} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'all' ? 'text-blue-400 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>All Images</button>
              </div>

              {/* Facebook Feed Preview */}
              {tab === 'fb-feed' && (
                <div className="bg-[#242526] rounded-lg max-w-[480px] mx-auto overflow-hidden">
                  <div className="flex items-center gap-2 p-3">
                    <div className="w-10 h-10 rounded-full bg-[#3a3b3c] flex items-center justify-center text-sm font-bold text-[#b0b3b8]">{initials}</div>
                    <div><div className="text-sm font-semibold text-[#e4e6eb]">{campaign.client_name}</div><div className="text-xs text-[#b0b3b8]">Sponsored</div></div>
                  </div>
                  {cr.primary_text && <div className="px-4 pb-3 text-sm text-[#e4e6eb] leading-relaxed whitespace-pre-wrap">{cr.primary_text}</div>}
                  {feedImg ? <img src={feedImg} alt="Ad" className="w-full block" /> : <div className="w-full h-64 bg-[#3a3b3c] flex items-center justify-center text-[#b0b3b8] text-sm">No image</div>}
                  <div className="p-3 border-t border-[#3a3b3c] flex items-center justify-between">
                    <div>
                      {cr.headline && <div className="text-[15px] font-semibold text-[#e4e6eb]">{cr.headline}</div>}
                      {cr.description && <div className="text-xs text-[#b0b3b8] mt-0.5">{cr.description}</div>}
                    </div>
                    <div className="bg-[#e4e6eb] text-[#050505] text-xs font-semibold px-3 py-1.5 rounded ml-3 shrink-0">{CTA_OPTIONS[cr.cta]}</div>
                  </div>
                </div>
              )}

              {/* Instagram Feed Preview */}
              {tab === 'ig-feed' && (
                <div className="bg-black rounded-lg max-w-[400px] mx-auto overflow-hidden">
                  <div className="flex items-center gap-2 p-3">
                    <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center text-xs font-bold text-[#a8a8a8]">{initials}</div>
                    <div><div className="text-[13px] font-semibold text-[#f5f5f5]">{campaign.client_name.toLowerCase().replace(/\s/g, '')}</div><div className="text-[11px] text-[#a8a8a8]">Sponsored</div></div>
                  </div>
                  {feedImg ? <img src={feedImg} alt="Ad" className="w-full block" /> : <div className="w-full h-64 bg-[#262626] flex items-center justify-center text-[#a8a8a8] text-sm">No image</div>}
                  <div className="p-3 border-t border-[#262626] flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#f5f5f5]">{cr.headline ?? ''}</span>
                    <div className="bg-[#0095f6] text-white text-xs font-semibold px-3 py-1 rounded ml-3 shrink-0">{CTA_OPTIONS[cr.cta]}</div>
                  </div>
                  {cr.primary_text && <div className="px-3 pb-3 text-[13px] text-[#f5f5f5]"><span className="font-semibold mr-1">{campaign.client_name.toLowerCase().replace(/\s/g, '')}</span>{cr.primary_text}</div>}
                </div>
              )}

              {/* Story Preview */}
              {tab === 'story' && (
                <div className="w-[270px] h-[480px] bg-black rounded-2xl overflow-hidden relative mx-auto">
                  {storyImg ? <img src={storyImg} alt="Story" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#262626] flex items-center justify-center text-[#a8a8a8] text-sm">No 9:16 image</div>}
                  <div className="absolute top-3 left-3 right-3 flex items-center gap-2 z-10">
                    <div className="w-7 h-7 rounded-full border-2 border-white bg-[#333] flex items-center justify-center text-[10px] text-[#ccc] font-bold">{initials}</div>
                    <div><div className="text-xs font-semibold text-white drop-shadow">{campaign.client_name}</div><div className="text-[10px] text-white/70 drop-shadow">Sponsored</div></div>
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 text-black text-xs font-semibold px-5 py-2 rounded-full z-10">{CTA_OPTIONS[cr.cta]}</div>
                </div>
              )}

              {/* All Images */}
              {tab === 'all' && (
                <div className="flex flex-wrap gap-4 justify-center">
                  {Object.entries(imgs).map(([orient, url]) => (
                    <div key={orient} className="text-center">
                      <img src={url} alt={orient} className="max-h-[200px] rounded-lg border border-border" />
                      <p className="text-xs text-gray-500 mt-1">{orient}</p>
                    </div>
                  ))}
                  {Object.keys(imgs).length === 0 && <p className="text-gray-500 text-sm">No images yet.</p>}
                </div>
              )}

              {/* Copy Panel */}
              <div className="mt-4 p-4 bg-bg rounded-lg grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Primary Text</p>
                  <p className="text-gray-300 whitespace-pre-wrap">{cr.primary_text ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Headline</p>
                  <p className="text-white font-semibold">{cr.headline ?? '—'}</p>
                  {cr.description && <>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-3 mb-1">Description</p>
                    <p className="text-gray-400">{cr.description}</p>
                  </>}
                </div>
              </div>

              {/* Feedback Actions */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-2 mb-3">
                  <button onClick={() => submitFeedback(cr.id, 'approve')} disabled={submitting[cr.id]} className="btn btn-sm btn-green">Approve</button>
                  <button onClick={() => submitFeedback(cr.id, 'revision')} disabled={submitting[cr.id]} className="btn btn-sm btn-orange">Request Revision</button>
                  <button onClick={() => setNoteOpen(p => ({ ...p, [cr.id]: !p[cr.id] }))} className="btn btn-sm btn-ghost">Add Note</button>
                </div>

                {noteOpen[cr.id] && (
                  <div className="mb-3 space-y-2">
                    <div className="flex gap-2">
                      <input className="input text-sm" placeholder="Your name" value={noteAuthor[cr.id] ?? ''} onChange={e => setNoteAuthor(p => ({ ...p, [cr.id]: e.target.value }))} />
                      <select className="input text-sm w-auto" value={noteTarget[cr.id] ?? 'general'} onChange={e => setNoteTarget(p => ({ ...p, [cr.id]: e.target.value }))}>
                        <option value="general">General</option>
                        <option value="copy">Copy</option>
                        <option value="image">Image</option>
                      </select>
                    </div>
                    <textarea className="input text-sm" rows={2} placeholder="Your feedback..." value={noteText[cr.id] ?? ''} onChange={e => setNoteText(p => ({ ...p, [cr.id]: e.target.value }))} />
                    <button className="btn btn-sm btn-blue" onClick={() => submitNote(cr.id)} disabled={submitting[cr.id]}>Submit Note</button>
                  </div>
                )}

                {/* Feedback Items */}
                {feedItems.filter(f => !f.is_internal).map(f => (
                  <div key={f.id} className="bg-bg border border-border rounded-lg p-3 text-sm mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{f.author_name}</span>
                      <span className={`badge text-xs ${f.feedback_type === 'approve' ? 'bg-green-900/50 text-green-400' : f.feedback_type === 'revision' ? 'bg-orange-900/50 text-orange-400' : 'bg-blue-900/50 text-blue-400'}`}>{f.feedback_type}</span>
                      {f.feedback_target !== 'general' && <span className="text-gray-600 text-xs">({f.feedback_target})</span>}
                      <span className="text-gray-600 text-xs ml-auto">{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                    {f.note_text && <p className="text-gray-400">{f.note_text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Client Context Form */}
        <div className="card mt-8">
          <h2 className="text-lg font-bold text-white mb-1">Help Us Create Better Ads</h2>
          <p className="text-sm text-gray-500 mb-5">Share your preferences so we can tailor ads to your brand.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Target Audience</label>
                <textarea className="input" rows={3} value={context.target_audience ?? ''} onChange={e => setContext(p => ({ ...p, target_audience: e.target.value }))} placeholder="Who are you trying to reach?" />
              </div>
              <div>
                <label className="label">Key Offers / Promotions</label>
                <textarea className="input" rows={3} value={context.key_offers ?? ''} onChange={e => setContext(p => ({ ...p, key_offers: e.target.value }))} placeholder="Current deals, unique selling points..." />
              </div>
              <div>
                <label className="label">Brand Style / Tone</label>
                <textarea className="input" rows={3} value={context.brand_style ?? ''} onChange={e => setContext(p => ({ ...p, brand_style: e.target.value }))} placeholder="Professional, fun, luxury..." />
              </div>
              <div>
                <label className="label">Image Preferences</label>
                <textarea className="input" rows={3} value={context.image_preferences ?? ''} onChange={e => setContext(p => ({ ...p, image_preferences: e.target.value }))} placeholder="Photography style, colors to use or avoid..." />
              </div>
              <div>
                <label className="label">Reference Ads You Like</label>
                <textarea className="input" rows={3} value={context.reference_ads ?? ''} onChange={e => setContext(p => ({ ...p, reference_ads: e.target.value }))} placeholder="Links to ads you admire..." />
              </div>
              <div>
                <label className="label">Additional Context</label>
                <textarea className="input" rows={3} value={context.additional_context ?? ''} onChange={e => setContext(p => ({ ...p, additional_context: e.target.value }))} placeholder="Anything else we should know..." />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn btn-blue" onClick={saveContext} disabled={contextSaving}>{contextSaving ? 'Saving...' : 'Save Preferences'}</button>
              {contextMsg && <span className="text-green-400 text-sm">{contextMsg}</span>}
            </div>
          </div>
        </div>

        <p className="text-center text-gray-700 text-sm mt-8">Powered by <strong className="text-gray-500">SpredX</strong></p>
      </div>
    </div>
  )
}
