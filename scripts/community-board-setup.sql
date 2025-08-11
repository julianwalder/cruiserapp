-- Community Board Database Setup
-- This script creates the necessary tables for the Community Board feature

-- 1. Create help_posts table for Ask/Offer posts
CREATE TABLE IF NOT EXISTS help_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('ask', 'offer')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    base_icao TEXT,
    when_ts TIMESTAMPTZ,
    category TEXT NOT NULL CHECK (category IN ('safety_pilot', 'cost_sharing', 'training_help', 'social_flight', 'other')),
    seats INTEGER,
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create help_responses table for responses to posts
CREATE TABLE IF NOT EXISTS help_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES help_posts(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(10) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create peer_invitations table for tracking invitations
CREATE TABLE IF NOT EXISTS peer_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL UNIQUE,
    invited_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_help_posts_author_id ON help_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_help_posts_status ON help_posts(status);
CREATE INDEX IF NOT EXISTS idx_help_posts_type ON help_posts(type);
CREATE INDEX IF NOT EXISTS idx_help_posts_category ON help_posts(category);
CREATE INDEX IF NOT EXISTS idx_help_posts_base_icao ON help_posts(base_icao);
CREATE INDEX IF NOT EXISTS idx_help_posts_expires_at ON help_posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_help_posts_created_at ON help_posts(created_at);

CREATE INDEX IF NOT EXISTS idx_help_responses_post_id ON help_responses(post_id);
CREATE INDEX IF NOT EXISTS idx_help_responses_responder_id ON help_responses(responder_id);
CREATE INDEX IF NOT EXISTS idx_help_responses_status ON help_responses(status);

CREATE INDEX IF NOT EXISTS idx_peer_invitations_inviter_id ON peer_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_peer_invitations_invite_code ON peer_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_peer_invitations_invited_user_id ON peer_invitations(invited_user_id);

-- Enable Row Level Security
ALTER TABLE help_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_posts
-- All authenticated users can view open posts
CREATE POLICY "Users can view open help posts" ON help_posts
    FOR SELECT USING (status = 'open');

-- Users can view their own posts regardless of status
CREATE POLICY "Users can view own help posts" ON help_posts
    FOR SELECT USING (auth.uid() = author_id);

-- Users can create their own posts
CREATE POLICY "Users can create help posts" ON help_posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update own help posts" ON help_posts
    FOR UPDATE USING (auth.uid() = author_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own help posts" ON help_posts
    FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for help_responses
-- Users can view responses to posts they authored
CREATE POLICY "Users can view responses to own posts" ON help_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM help_posts 
            WHERE help_posts.id = help_responses.post_id 
            AND help_posts.author_id = auth.uid()
        )
    );

-- Users can view their own responses
CREATE POLICY "Users can view own responses" ON help_responses
    FOR SELECT USING (auth.uid() = responder_id);

-- Users can create responses to any open post
CREATE POLICY "Users can create responses" ON help_responses
    FOR INSERT WITH CHECK (
        auth.uid() = responder_id AND
        EXISTS (
            SELECT 1 FROM help_posts 
            WHERE help_posts.id = help_responses.post_id 
            AND help_posts.status = 'open'
        )
    );

-- Post authors can update response status
CREATE POLICY "Post authors can update response status" ON help_responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM help_posts 
            WHERE help_posts.id = help_responses.post_id 
            AND help_posts.author_id = auth.uid()
        )
    );

-- RLS Policies for peer_invitations
-- Users can view their own invitations
CREATE POLICY "Users can view own invitations" ON peer_invitations
    FOR SELECT USING (auth.uid() = inviter_id);

-- Users can create invitations
CREATE POLICY "Users can create invitations" ON peer_invitations
    FOR INSERT WITH CHECK (auth.uid() = inviter_id);

-- Users can update their own invitations
CREATE POLICY "Users can update own invitations" ON peer_invitations
    FOR UPDATE USING (auth.uid() = inviter_id);

-- Create function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_already BOOLEAN;
BEGIN
    LOOP
        -- Generate a 8-character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM peer_invitations WHERE invite_code = code) INTO exists_already;
        
        -- If code doesn't exist, return it
        IF NOT exists_already THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to expire old posts
CREATE OR REPLACE FUNCTION expire_old_posts()
RETURNS void AS $$
BEGIN
    UPDATE help_posts 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'open' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a view for posts with author information
CREATE OR REPLACE VIEW help_posts_with_author AS
SELECT 
    hp.*,
    u."firstName" as author_first_name,
    u."lastName" as author_last_name,
    u."avatarUrl" as author_avatar_url,
    COUNT(hr.id) as response_count
FROM help_posts hp
JOIN users u ON hp.author_id = u.id
LEFT JOIN help_responses hr ON hp.id = hr.post_id AND hr.status = 'proposed'
WHERE hp.status = 'open'
GROUP BY hp.id, u."firstName", u."lastName", u."avatarUrl";

-- Create a view for responses with responder information
CREATE OR REPLACE VIEW help_responses_with_responder AS
SELECT 
    hr.*,
    u."firstName" as responder_first_name,
    u."lastName" as responder_last_name,
    u."avatarUrl" as responder_avatar_url
FROM help_responses hr
JOIN users u ON hr.responder_id = u.id;

-- Grant necessary permissions
GRANT SELECT ON help_posts_with_author TO authenticated;
GRANT SELECT ON help_responses_with_responder TO authenticated;
