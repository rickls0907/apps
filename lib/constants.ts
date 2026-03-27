import type { CtaOption, Orientation } from './types'

export const CTA_OPTIONS: Record<CtaOption, string> = {
  learn_more:  'Learn More',
  shop_now:    'Shop Now',
  sign_up:     'Sign Up',
  contact_us:  'Contact Us',
  get_offer:   'Get Offer',
  book_now:    'Book Now',
  download:    'Download',
  apply_now:   'Apply Now',
  get_quote:   'Get Quote',
  watch_more:  'Watch More',
  subscribe:   'Subscribe',
  order_now:   'Order Now',
}

export const AD_ORIENTATIONS: Record<Orientation, { label: string; width: number; height: number; aspect: string }> = {
  '1x1':  { label: '1:1 Feed',       width: 1080, height: 1080, aspect: '1:1'  },
  '4x5':  { label: '4:5 Portrait',   width: 1080, height: 1350, aspect: '4:5'  },
  '9x16': { label: '9:16 Story/Reel',width: 1080, height: 1920, aspect: '9:16' },
  '16x9': { label: '16:9 Landscape', width: 1920, height: 1080, aspect: '16:9' },
}

export const STATUS_COLORS: Record<string, string> = {
  draft:              'bg-gray-800 text-gray-400',
  in_review:          'bg-yellow-900/50 text-yellow-400',
  approved:           'bg-green-900/50 text-green-400',
  revision_requested: 'bg-orange-900/50 text-orange-400',
  pending:            'bg-gray-800 text-gray-400',
  revision:           'bg-orange-900/50 text-orange-400',
  rejected:           'bg-red-900/50 text-red-400',
  approve:            'bg-green-900/50 text-green-400',
  note:               'bg-blue-900/50 text-blue-400',
}

export const STATUS_LABELS: Record<string, string> = {
  draft:              'Draft',
  in_review:          'In Review',
  approved:           'Approved',
  revision_requested: 'Revision Requested',
  pending:            'Pending',
  revision:           'Revision',
  rejected:           'Rejected',
  approve:            'Approved',
  note:               'Note',
}

export const PLATFORM_LABELS: Record<string, string> = {
  facebook:  'Facebook',
  instagram: 'Instagram',
  both:      'Facebook + Instagram',
}
