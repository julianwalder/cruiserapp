-- Drop existing webhook_events table if it exists
DROP TABLE IF EXISTS webhook_events CASCADE;

-- Create webhook events table for monitoring with correct structure
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL,
  eventType TEXT NOT NULL,
  webhookType TEXT NOT NULL,
  sessionId TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  error TEXT,
  retryCount INTEGER DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processedAt TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_event_type CHECK (eventType IN ('received', 'processed', 'failed', 'retry')),
  CONSTRAINT valid_webhook_type CHECK (webhookType IN ('submitted', 'approved', 'declined', 'unknown')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'success', 'error'))
);

-- Create indexes for better performance
CREATE INDEX idx_webhook_events_user_id ON webhook_events(userId);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(createdAt);
CREATE INDEX idx_webhook_events_session_id ON webhook_events(sessionId);

-- Add comments for documentation
COMMENT ON TABLE webhook_events IS 'Webhook events for monitoring and debugging';
COMMENT ON COLUMN webhook_events.userId IS 'User ID associated with the webhook';
COMMENT ON COLUMN webhook_events.eventType IS 'Type of webhook event (received, processed, failed, retry)';
COMMENT ON COLUMN webhook_events.webhookType IS 'Type of webhook (submitted, approved, declined, unknown)';
COMMENT ON COLUMN webhook_events.sessionId IS 'Veriff session ID';
COMMENT ON COLUMN webhook_events.status IS 'Processing status (pending, success, error)';
COMMENT ON COLUMN webhook_events.payload IS 'Full webhook payload';
COMMENT ON COLUMN webhook_events.error IS 'Error message if processing failed';
COMMENT ON COLUMN webhook_events.retryCount IS 'Number of retry attempts';
COMMENT ON COLUMN webhook_events.createdAt IS 'When the webhook was received';
COMMENT ON COLUMN webhook_events.processedAt IS 'When the webhook was processed'; 