import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, string> = {
    facebook:  'bg-blue-900/50 text-blue-400',
    instagram: 'bg-pink-900/50 text-pink-400',
    both:      'bg-purple-900/50 text-purple-400',
  }
  const label: Record<string, string> = {
    facebook: 'FB', instagram: 'IG', both: 'FB + IG',
  }
  return (
    <span className={`badge ${map[platform] ?? 'bg-gray-800 text-gray-400'}`}>
      {label[platform] ?? platform}
    </span>
  )
}
