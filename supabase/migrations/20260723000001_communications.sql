-- ════════════════════════════════════════════════════════════
-- Communications — voice calls, SMS, voicemail (Phase 1)
--
-- The Communications module (browser dialer, IVR, recording, voicemail,
-- in-call transfer/hold, call history, single + bulk SMS, inbound webhooks,
-- Whisper transcription) was already fully coded in src/app/api/{twilio,calls,
-- sms,voicemails} and src/components/communications — but the tables it writes
-- to were never created. This migration provisions them to match that code
-- EXACTLY (column names are load-bearing), and adds two columns the code
-- didn't have but the product needs:
--   • price / price_unit  — cost per call (backfilled from Twilio)
--   • contact_id          — links a call/SMS/voicemail to a sig_contacts row
--
-- These are intentionally NOT sig_-prefixed: the existing code queries the
-- names call_logs / sms_messages / voicemails, so the tables must use them.
--
-- Writes go through the service-role client (webhooks), which bypasses RLS;
-- the policies below only gate direct client-side reads.
-- ════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Redefined defensively so this migration stands alone (see prior migrations).
CREATE OR REPLACE FUNCTION sig_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sig_is_active_internal()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM sig_profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.is_internal_user = true
      AND p.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── CALL LOGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid            text        UNIQUE,
  direction           text        CHECK (direction IN ('inbound', 'outbound')),
  from_number         text,
  to_number           text,
  status              text,
  duration            integer,

  -- Recording + transcription
  recording_url       text,
  recording_sid       text,
  transcription       text,

  -- Live in-call control flags / transfer (src/app/api/calls/control)
  is_recording        boolean     NOT NULL DEFAULT false,
  is_on_hold          boolean     NOT NULL DEFAULT false,
  transferred_to      text,
  transfer_type       text,
  transfer_conference text,

  notes               text,

  -- Cost per call. Twilio finalizes `price` asynchronously (negative); store
  -- the positive magnitude + its currency unit. Backfilled by the app.
  price               numeric(10,5),
  price_unit          text,

  -- Link to the CRM contact this call is with (resolved by phone).
  contact_id          uuid        REFERENCES sig_contacts(id) ON DELETE SET NULL,

  started_at          timestamptz,
  ended_at            timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid    ON call_logs (call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at  ON call_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_direction   ON call_logs (direction, status);
CREATE INDEX IF NOT EXISTS idx_call_logs_contact_id  ON call_logs (contact_id);
DROP TRIGGER IF EXISTS call_logs_updated_at ON call_logs;
CREATE TRIGGER call_logs_updated_at
  BEFORE UPDATE ON call_logs FOR EACH ROW EXECUTE FUNCTION sig_set_updated_at();

-- ─── SMS MESSAGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid   text        UNIQUE,
  direction     text        CHECK (direction IN ('inbound', 'outbound')),
  from_number   text,
  to_number     text,
  body          text,
  status        text,
  is_read       boolean     NOT NULL DEFAULT false,
  -- Inbound MMS media links (Twilio MediaUrlN).
  media_urls    text[],
  -- Groups all messages sent in one bulk broadcast.
  bulk_id       text,
  error_code    text,
  error_message text,
  -- Link to the CRM contact this thread is with.
  contact_id    uuid        REFERENCES sig_contacts(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_messages_message_sid ON sms_messages (message_sid);
CREATE INDEX IF NOT EXISTS idx_sms_messages_from        ON sms_messages (from_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_to          ON sms_messages (to_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at  ON sms_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_bulk_id     ON sms_messages (bulk_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_contact_id  ON sms_messages (contact_id);

-- ─── VOICEMAILS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voicemails (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid      text,
  from_number   text,
  to_number     text,
  recording_url text,
  recording_sid text,
  duration      integer,
  transcription text,
  is_read       boolean     NOT NULL DEFAULT false,
  contact_id    uuid        REFERENCES sig_contacts(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voicemails_created_at ON voicemails (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voicemails_is_read    ON voicemails (is_read);
CREATE INDEX IF NOT EXISTS idx_voicemails_contact_id ON voicemails (contact_id);

-- ─── SMS CONVERSATION LIST RPC ────────────────────────────
-- The SMS inbox calls supabaseAdmin.rpc('get_sms_conversations'). Returns one
-- row per counterparty number with its latest message, newest first. Shape
-- must match the code's in-memory fallback: contact_number, last_message,
-- last_message_at, direction, is_read.
CREATE OR REPLACE FUNCTION get_sms_conversations()
RETURNS TABLE (
  contact_number  text,
  last_message    text,
  last_message_at timestamptz,
  direction       text,
  is_read         boolean
)
LANGUAGE sql STABLE AS $$
  SELECT * FROM (
    SELECT DISTINCT ON (contact)
      contact       AS contact_number,
      body          AS last_message,
      created_at    AS last_message_at,
      direction,
      is_read
    FROM (
      SELECT
        CASE WHEN direction = 'inbound' THEN from_number ELSE to_number END AS contact,
        body, created_at, direction, is_read
      FROM sms_messages
    ) flattened
    ORDER BY contact, created_at DESC
  ) latest
  ORDER BY last_message_at DESC;
$$;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────
-- Service-role webhook/API writes bypass RLS. These gate direct client reads
-- to active internal staff; no client write policies (service-role only).
ALTER TABLE call_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voicemails   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS call_logs_read ON call_logs;
CREATE POLICY call_logs_read ON call_logs
  FOR SELECT USING (sig_is_active_internal());

DROP POLICY IF EXISTS sms_messages_read ON sms_messages;
CREATE POLICY sms_messages_read ON sms_messages
  FOR SELECT USING (sig_is_active_internal());

DROP POLICY IF EXISTS voicemails_read ON voicemails;
CREATE POLICY voicemails_read ON voicemails
  FOR SELECT USING (sig_is_active_internal());
