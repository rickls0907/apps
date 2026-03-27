'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge, PlatformBadge } from '@/components/StatusBadge'
import type { AdClient, AdCampaign } from '@/lib/types'

export default function ClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<AdClient | null>(null)
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [campaignOpen, setCampaignOpen] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editForm, setEditForm] = useState<Partial<AdClient>>({})
  const [contextText, setContextText] = useState('')
  const [campaignForm, setCampaignForm] = useState({ name: '', platform: 'both', strategy_notes: '' })

  const load = useCallback(async () => {
    const [clientRes, camRes] = await Promise.all([
      fetch(`/api/clients/${id}`),
      fetch(`/api/campaigns?client_id=${id}`),
    ])
    const c = await clientRes.json()
    setClient(c)
    setEditForm(c)
    setContextText(c.site_context ?? '')

    // Load campaigns separately
    const { data: camps } = await (await fetch(`/api/clients/${id}/campaigns`)).json().catch(() => ({ data: [] }))
    // Fallback: re-query campaigns via campaigns route not yet built — get from client detail
    // We'll fetch campaigns from a simpler approach
    const camData = await fetch(`/api/campaigns?client_id=${id}`).then(r => r.json()).catch(() => [])
    setCampaigns(Array.isArray(camData) ? camData : [])
  }, [id])

  useEffect(() => { load() }, [load])

  async function saveClient() {
    setSaving(true)
    await fetch(`/api/clients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) })
    setMsg('Saved')
    setEditOpen(false)
    setSaving(false)
    load()
  }

  async function saveContext() {
    setSaving(true)
    await fetch(`/api/clients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ site_context: contextText }) })
    setMsg('Context saved')
    setContextOpen(false)
    setSaving(false)
    load()
  }

  async function fetchSiteContext() {
    setFetching(true)
    setMsg('')
    const res = await fetch(`/api/clients/${id}/sync-context`, { method: 'POST' })
    const data = await res.json()
    if (data.ok) { setMsg('Context fetched'); load() }
    else setMsg(`Error: ${data.error}`)
    setFetching(false)
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: id, ...campaignForm }),
    })
    const data = await res.json()
    if (res.ok) router.push(`/campaigns/${data.id}`)
    else { setMsg(`Error: ${data.error}`); setSaving(false) }
  }

  if (!client) return <div className="min-h-screen bg-bg flex items-center justify-center text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-bg">
      <nav className="nav-bar">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/clients" className="text-gray-500 hover:text-gray-300">Ad Studio</Link>
          <span className="text-gray-700">/</span>
          <span className="text-white font-semibold">{client.name}</span>
        </div>
        <Link href="https://vibe.spredx.com/home" className="text-sm text-gray-500 hover:text-gray-300">Command Center</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {msg && <div className="bg-green-900/30 border border-green-800 text-green-400 text-sm px-4 py-2 rounded-lg">{msg}</div>}

        {/* Client Info */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Client Info</h2>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditOpen(!editOpen)}>Edit</button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Website:</span> {client.website_url ? <a href={client.website_url} target="_blank" rel="noreferrer" className="text-blue-400 ml-1">{client.website_url}</a> : <span className="text-gray-600 ml-1">Not set</span>}</div>
            <div><span className="text-gray-500">Notifications:</span> <span className="text-gray-400 ml-1">{client.notify_emails ?? 'Default'}</span></div>
            <div><span className="text-gray-500">Facebook:</span> {client.facebook_url ? <a href={client.facebook_url} target="_blank" rel="noreferrer" className="text-blue-400 ml-1">View</a> : <span className="text-gray-600 ml-1">Not set</span>}</div>
            <div><span className="text-gray-500">Instagram:</span> {client.instagram_url ? <a href={client.instagram_url} target="_blank" rel="noreferrer" className="text-blue-400 ml-1">View</a> : <span className="text-gray-600 ml-1">Not set</span>}</div>
          </div>
          {editOpen && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Name</label><input className="input" value={editForm.name ?? ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><label className="label">Notification Emails</label><input className="input" value={editForm.notify_emails ?? ''} onChange={e => setEditForm(p => ({ ...p, notify_emails: e.target.value }))} /></div>
                <div><label className="label">Website URL</label><input type="url" className="input" value={editForm.website_url ?? ''} onChange={e => setEditForm(p => ({ ...p, website_url: e.target.value }))} /></div>
                <div><label className="label">Facebook URL</label><input type="url" className="input" value={editForm.facebook_url ?? ''} onChange={e => setEditForm(p => ({ ...p, facebook_url: e.target.value }))} /></div>
                <div><label className="label">Instagram URL</label><input type="url" className="input" value={editForm.instagram_url ?? ''} onChange={e => setEditForm(p => ({ ...p, instagram_url: e.target.value }))} /></div>
                <div><label className="label">Strategy Notes</label><textarea className="input" rows={2} value={editForm.strategy_notes ?? ''} onChange={e => setEditForm(p => ({ ...p, strategy_notes: e.target.value }))} /></div>
              </div>
              <button className="btn btn-sm btn-blue" onClick={saveClient} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          )}
        </div>

        {/* Site Context */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Site Context</h2>
            <div className="flex gap-2">
              {client.website_url && (
                <button className="btn btn-sm btn-ghost" onClick={fetchSiteContext} disabled={fetching}>
                  {fetching ? 'Fetching...' : 'Fetch from Website'}
                </button>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => setContextOpen(!contextOpen)}>Edit Manually</button>
            </div>
          </div>
          {client.site_context
            ? <p className="text-sm text-gray-400 whitespace-pre-wrap">{client.site_context}</p>
            : <p className="text-sm text-gray-600">No site context yet. Fetch from the client website or enter manually.</p>
          }
          {client.site_context_fetched_at && (
            <p className="text-xs text-gray-600 mt-2">Fetched: {new Date(client.site_context_fetched_at).toLocaleString()}</p>
          )}
          {contextOpen && (
            <div className="mt-4 pt-4 border-t border-border">
              <label className="label">Site Context</label>
              <textarea className="input" rows={8} value={contextText} onChange={e => setContextText(e.target.value)} />
              <button className="btn btn-sm btn-blue mt-2" onClick={saveContext} disabled={saving}>{saving ? 'Saving...' : 'Save Context'}</button>
            </div>
          )}
        </div>

        {/* Campaigns */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white text-lg">Campaigns</h2>
            <button className="btn btn-sm btn-blue" onClick={() => setCampaignOpen(!campaignOpen)}>+ New Campaign</button>
          </div>

          {campaignOpen && (
            <form onSubmit={createCampaign} className="card mb-4 space-y-4">
              <h3 className="font-semibold text-white">Create Campaign</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Campaign Name *</label>
                  <input className="input" required value={campaignForm.name} onChange={e => setCampaignForm(p => ({ ...p, name: e.target.value }))} placeholder="Spring Sale 2026" />
                </div>
                <div>
                  <label className="label">Platform</label>
                  <select className="input" value={campaignForm.platform} onChange={e => setCampaignForm(p => ({ ...p, platform: e.target.value }))}>
                    <option value="both">Facebook + Instagram</option>
                    <option value="facebook">Facebook Only</option>
                    <option value="instagram">Instagram Only</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Strategy / Notes</label>
                <textarea className="input" rows={3} value={campaignForm.strategy_notes} onChange={e => setCampaignForm(p => ({ ...p, strategy_notes: e.target.value }))} placeholder="Target audience, offer details, goals..." />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-blue" disabled={saving}>{saving ? 'Creating...' : 'Create Campaign'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setCampaignOpen(false)}>Cancel</button>
              </div>
            </form>
          )}

          {campaigns.length === 0
            ? <div className="card text-center py-8 text-gray-500">No campaigns yet.</div>
            : campaigns.map(cam => (
              <Link key={cam.id} href={`/campaigns/${cam.id}`} className="card block mb-3 hover:border-blue-600 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{cam.name}</span>
                  <StatusBadge status={cam.status} />
                </div>
                <div className="flex gap-3 text-sm text-gray-500 items-center">
                  <PlatformBadge platform={cam.platform} />
                  <span>{cam.creative_count ?? 0} creatives</span>
                  {(cam.feedback_count ?? 0) > 0 && <span className="text-orange-400">{cam.feedback_count} feedback</span>}
                  <span className="text-gray-600">{new Date(cam.created_at).toLocaleDateString()}</span>
                </div>
                {(cam.creative_count ?? 0) > 0 && (
                  <>
                    <div className="progress-bar mt-2">
                      <div className="progress-fill" style={{ width: `${Math.round(((cam.approved_count ?? 0) / (cam.creative_count ?? 1)) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{cam.approved_count}/{cam.creative_count} approved</p>
                  </>
                )}
              </Link>
            ))
          }
        </div>
      </div>
    </div>
  )
}
