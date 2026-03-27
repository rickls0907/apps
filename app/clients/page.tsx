import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { StatusBadge, PlatformBadge } from '@/components/StatusBadge'
import type { AdClient } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function getClients(): Promise<AdClient[]> {
  const { data } = await supabase
    .from('ad_clients')
    .select(`*, ad_campaigns(id, status, name, platform, ad_creatives(id, status), ad_feedback:ad_creatives(ad_feedback(id, is_internal)))`)
    .order('updated_at', { ascending: false })

  return (data ?? []).map(c => {
    const campaigns = c.ad_campaigns ?? []
    const creatives = campaigns.flatMap((cam: { ad_creatives: { status: string }[] }) => cam.ad_creatives ?? [])
    const feedbacks = campaigns.flatMap((cam: { ad_feedback: { ad_feedback: { is_internal: boolean }[] }[] }) =>
      cam.ad_feedback?.flatMap(cr => cr.ad_feedback ?? []) ?? []
    )
    const latest = campaigns[0]
    return {
      ...c,
      ad_campaigns: undefined,
      campaign_count: campaigns.length,
      total_creatives: creatives.length,
      approved_creatives: creatives.filter((cr: { status: string }) => cr.status === 'approved').length,
      feedback_count: feedbacks.filter((f: { is_internal: boolean }) => !f.is_internal).length,
      latest_campaign: latest?.name ?? null,
      latest_status: latest?.status ?? null,
    }
  })
}

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div className="min-h-screen bg-bg">
      <nav className="nav-bar">
        <span className="font-bold text-white">Ad Creative Studio</span>
        <Link href="https://vibe.spredx.com/home" className="text-sm text-gray-500 hover:text-gray-300">
          Command Center
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Clients</h1>
          <Link href="/clients/new" className="btn btn-blue">+ New Client</Link>
        </div>

        {clients.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-500 mb-4">No clients yet.</p>
            <Link href="/clients/new" className="btn btn-blue">+ New Client</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(c => (
              <Link key={c.id} href={`/clients/${c.id}`} className="card hover:border-blue-600 transition-colors block">
                <h3 className="font-semibold text-white mb-2">{c.name}</h3>
                <div className="flex gap-3 text-sm text-gray-500 mb-3 flex-wrap">
                  <span>{c.campaign_count} campaign{c.campaign_count !== 1 ? 's' : ''}</span>
                  <span>{c.total_creatives} creative{c.total_creatives !== 1 ? 's' : ''}</span>
                  {(c.feedback_count ?? 0) > 0 && (
                    <span className="text-orange-400">{c.feedback_count} feedback</span>
                  )}
                </div>
                {c.latest_campaign && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 truncate mr-2">{c.latest_campaign}</span>
                    {c.latest_status && <StatusBadge status={c.latest_status} />}
                  </div>
                )}
                {(c.total_creatives ?? 0) > 0 && (
                  <>
                    <div className="progress-bar mt-3">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round(((c.approved_creatives ?? 0) / (c.total_creatives ?? 1)) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{c.approved_creatives}/{c.total_creatives} approved</p>
                  </>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
