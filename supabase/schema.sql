-- ============================================================
-- SpredX Ad Creative Studio — Supabase Schema
-- Run once in Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_clients (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,
  slug                   TEXT NOT NULL UNIQUE,
  website_url            TEXT,
  facebook_url           TEXT,
  instagram_url          TEXT,
  site_context           TEXT,
  site_context_fetched_at TIMESTAMPTZ,
  strategy_notes         TEXT,
  notify_emails          TEXT,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- ── Campaigns ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL REFERENCES ad_clients(id) ON DELETE CASCADE,
  client_name          TEXT NOT NULL,
  client_slug          TEXT NOT NULL,
  name                 TEXT NOT NULL,
  platform             TEXT NOT NULL DEFAULT 'both',
  status               TEXT NOT NULL DEFAULT 'draft',
  review_token         TEXT UNIQUE,
  strategy_notes       TEXT,
  client_context       JSONB,
  context_submitted_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_client ON ad_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON ad_campaigns(status);

-- ── Creatives ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_creatives (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  sort_order     INT NOT NULL DEFAULT 0,
  primary_text   TEXT,
  headline       TEXT,
  description    TEXT,
  cta            TEXT NOT NULL DEFAULT 'learn_more',
  images         JSONB NOT NULL DEFAULT '{}',
  image_prompts  JSONB NOT NULL DEFAULT '{}',
  orientations   JSONB NOT NULL DEFAULT '[]',
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creatives_campaign ON ad_creatives(campaign_id, sort_order);

-- ── Feedback ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id     UUID NOT NULL REFERENCES ad_creatives(id) ON DELETE CASCADE,
  author_name     TEXT NOT NULL DEFAULT 'Client',
  feedback_type   TEXT NOT NULL,
  feedback_target TEXT NOT NULL DEFAULT 'general',
  is_internal     BOOLEAN NOT NULL DEFAULT false,
  note_text       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_creative ON ad_feedback(creative_id);

-- ── Storage bucket (run separately or via Supabase dashboard) ──
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ad-images', 'ad-images', true)
-- ON CONFLICT DO NOTHING;

-- ── Updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_clients_updated
  BEFORE UPDATE ON ad_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_campaigns_updated
  BEFORE UPDATE ON ad_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_creatives_updated
  BEFORE UPDATE ON ad_creatives FOR EACH ROW EXECUTE FUNCTION update_updated_at();
