/*
  # Enable pg_cron and create auto-send scheduled job

  ## Summary
  Activates the pg_cron extension and creates a recurring job that calls
  the auto-send-payment Edge Function every 5 minutes to process pending
  preorders according to the auto_send_settings configuration.

  ## Changes
  - Enables the pg_cron extension
  - Enables the pg_net extension (required to make HTTP calls from pg_cron)
  - Creates a cron job "auto-send-payment-job" that runs every 5 minutes
    and sends a POST request to the auto-send-payment Edge Function

  ## Notes
  - The job respects the enabled/delay_minutes settings stored in auto_send_settings
  - If auto-send is disabled in the settings, the Edge Function returns immediately without sending
  - The service role key is used as the Authorization header for the edge function call
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'auto-send-payment-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url    := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/auto-send-payment',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body   := '{}'::jsonb
  );
  $$
);
