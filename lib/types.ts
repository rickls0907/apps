export type Platform = 'facebook' | 'instagram' | 'both'
export type CampaignStatus = 'draft' | 'in_review' | 'approved' | 'revision_requested'
export type CreativeStatus = 'pending' | 'approved' | 'revision' | 'rejected'
export type FeedbackType = 'approve' | 'revision' | 'note'
export type FeedbackTarget = 'copy' | 'image' | 'general'
export type Orientation = '1x1' | '4x5' | '9x16' | '16x9'
export type CtaOption =
  | 'learn_more' | 'shop_now' | 'sign_up' | 'contact_us' | 'get_offer'
  | 'book_now' | 'download' | 'apply_now' | 'get_quote' | 'watch_more'
  | 'subscribe' | 'order_now'

export interface AdClient {
  id: string
  name: string
  slug: string
  website_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  site_context: string | null
  site_context_fetched_at: string | null
  strategy_notes: string | null
  notify_emails: string | null
  created_at: string
  updated_at: string
  // Computed (from joins)
  campaign_count?: number
  total_creatives?: number
  approved_creatives?: number
  feedback_count?: number
  latest_campaign?: string | null
  latest_status?: CampaignStatus | null
}

export interface AdCampaign {
  id: string
  client_id: string
  client_name: string
  client_slug: string
  name: string
  platform: Platform
  status: CampaignStatus
  review_token: string
  strategy_notes: string | null
  client_context: ClientContext | null
  context_submitted_at: string | null
  created_at: string
  updated_at: string
  // Computed
  creative_count?: number
  approved_count?: number
  feedback_count?: number
}

export interface AdCreative {
  id: string
  campaign_id: string
  sort_order: number
  primary_text: string | null
  headline: string | null
  description: string | null
  cta: CtaOption
  images: Record<Orientation, string>
  image_prompts: Record<Orientation, string>
  orientations: Orientation[]
  status: CreativeStatus
  created_at: string
  updated_at: string
  // Computed
  client_feedback_count?: number
  team_feedback_count?: number
}

export interface AdFeedback {
  id: string
  creative_id: string
  author_name: string
  feedback_type: FeedbackType
  feedback_target: FeedbackTarget
  is_internal: boolean
  note_text: string | null
  created_at: string
}

export interface ClientContext {
  target_audience?: string
  key_offers?: string
  brand_style?: string
  image_preferences?: string
  reference_ads?: string
  additional_context?: string
}
