-- Migration: Enable RLS on webhook_events table
-- Fixes security issue: webhook_events was public without RLS

-- Enable Row Level Security
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role (internal backend) can manage webhook events
-- This table is for idempotency tracking and should not be accessible
-- to regular API clients (anon/app roles)
CREATE POLICY "Service role can manage webhook events"
  ON webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated service accounts to read webhook events
-- (for monitoring/debugging purposes)
CREATE POLICY "Service accounts can read webhook events"
  ON webhook_events
  FOR SELECT
  TO authenticated
  USING (
    -- Only service accounts (users with owner role) can read webhook events
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
  );
