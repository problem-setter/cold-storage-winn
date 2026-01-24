-- ===== SETUP DATABASE WEBHOOK DI SUPABASE =====
-- Langkah-langkah:
-- 1. Buka Supabase Dashboard → Database → Webhooks
-- 2. Click "Create a new webhook"
-- 3. Setup seperti di bawah ini:

-- TABLE: cold_storage
-- EVENTS: Insert, Update
-- URL: https://{PROJECT_ID}.supabase.co/functions/v1/monitor-changes
-- HTTP METHOD: POST
-- HEADERS (klik "Add header"):
--   - Authorization: Bearer {SERVICE_ROLE_KEY}
--   - Content-Type: application/json

-- Payload akan otomatis dikirim dalam format:
-- {
--   "type": "INSERT" | "UPDATE" | "DELETE",
--   "record": {
--     "old_record": {...},  // untuk UPDATE dan DELETE
--     "new_record": {...}   // untuk INSERT dan UPDATE
--   }
-- }

-- Webhook ini akan otomatis trigger monitor-changes function saat:
-- - Ada INSERT ke cold_storage
-- - Ada UPDATE ke cold_storage (paling penting untuk detect perubahan status)

-- Setelah setup, setiap ada perubahan data akan langsung trigger FCM!

-- ===== ATAU SETUP VIA SQL TRIGGER (Alternative) =====
-- Jika ingin pakai PostgreSQL trigger langsung ke http function:

-- Pastikan extension pg_http sudah di-enable:
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;

-- Function untuk trigger webhook
CREATE OR REPLACE FUNCTION notify_via_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger edge function via HTTP
  PERFORM extensions.http_post(
    'https://{PROJECT_ID}.supabase.co/functions/v1/monitor-changes',
    jsonb_build_object(
      'type', TG_OP,
      'record', jsonb_build_object(
        'old_record', to_jsonb(OLD),
        'new_record', to_jsonb(NEW)
      )
    ),
    jsonb_build_object(
      'Authorization', 'Bearer {SERVICE_ROLE_KEY}',
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS webhook_notify ON cold_storage;
CREATE TRIGGER webhook_notify
AFTER UPDATE ON cold_storage
FOR EACH ROW
EXECUTE FUNCTION notify_via_webhook();
