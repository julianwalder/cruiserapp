-- Update user_onboarding table to use snake_case column names
-- Run this in your Supabase SQL Editor

-- First, drop the existing table (this will remove any existing data)
-- If you have important data, you might want to backup first
DROP TABLE IF EXISTS user_onboarding CASCADE;

-- Create the table with proper snake_case column names
CREATE TABLE user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  onboarding_type VARCHAR(20) NOT NULL CHECK (onboarding_type IN ('STUDENT', 'PILOT')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 5,
  veriff_session_id VARCHAR(255),
  veriff_status VARCHAR(50),
  payment_plan_id UUID,
  hour_package_id UUID,
  contract_signed BOOLEAN DEFAULT FALSE,
  contract_signed_at TIMESTAMP WITH TIME ZONE,
  contract_document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX idx_user_onboarding_status ON user_onboarding(status);
CREATE INDEX idx_user_onboarding_type ON user_onboarding(onboarding_type);

-- Enable Row Level Security (RLS)
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own onboarding" ON user_onboarding
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding" ON user_onboarding
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding" ON user_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding" ON user_onboarding
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur."roleId" = r.id
      WHERE ur."userId" = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Verify the table was created successfully
SELECT 'user_onboarding table created successfully with snake_case columns!' as status;

-- Show the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_onboarding' 
ORDER BY ordinal_position;
