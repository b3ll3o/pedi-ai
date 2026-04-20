-- Migration: Create webhook_events table for idempotency
-- Tracks processed webhook events to prevent duplicate handling

CREATE TABLE IF NOT EXISTS webhook_events (
    id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at);