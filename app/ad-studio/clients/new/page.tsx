'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', website_url: '', facebook_url: '', instagram_url: '',
    strategy_notes: '', notify_emails: '',
  })

  function set(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      router.push(`/ad-studio/clients/${data.id}`)
    } else {
      setError(data.error ?? 'Failed to create client')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="nav-bar">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/ad-studio/clients" className="text-gray-500 hover:text-gray-300">Ad Studio</Link>
          <span className="text-gray-700">/</span>
          <span className="text-white font-semibold">New Client</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">New Client</h1>
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client Name *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Acme Roofing" />
            </div>
            <div>
              <label className="label">Notification Emails</label>
              <input className="input" value={form.notify_emails} onChange={e => set('notify_emails', e.target.value)} placeholder="rick@spredx.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Website URL</label>
              <input type="url" className="input" value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://" />
            </div>
            <div>
              <label className="label">Facebook Page URL</label>
              <input type="url" className="input" value={form.facebook_url} onChange={e => set('facebook_url', e.target.value)} placeholder="https://facebook.com/..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Instagram URL</label>
              <input type="url" className="input" value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="https://instagram.com/..." />
            </div>
            <div>
              <label className="label">Strategy Notes</label>
              <textarea className="input" rows={3} value={form.strategy_notes} onChange={e => set('strategy_notes', e.target.value)} placeholder="Target audience, brand notes..." />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn btn-blue" disabled={loading}>
              {loading ? 'Creating...' : 'Create Client'}
            </button>
            <Link href="/ad-studio/clients" className="btn btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
