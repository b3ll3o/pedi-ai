-- Migration: Create notifications table
-- Customer notifications for order status updates

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'Customer notifications for order updates and system messages';

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (
    user_id = auth.uid()
);

CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (
    user_id = auth.uid()
);

CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (
    true
);
