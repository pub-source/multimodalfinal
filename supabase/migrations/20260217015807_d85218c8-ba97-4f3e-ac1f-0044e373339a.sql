
-- Create a function to delete records older than 24 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.detection_logs WHERE created_at < now() - interval '24 hours';
  DELETE FROM public.alerts WHERE created_at < now() - interval '24 hours';
  DELETE FROM public.analytics_timeseries WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Create pg_cron extension for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Schedule the cleanup to run every hour
SELECT cron.schedule(
  'cleanup-old-records',
  '0 * * * *',
  $$SELECT public.cleanup_old_records()$$
);
