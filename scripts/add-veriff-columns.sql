-- Add missing Veriff columns to users table
-- This migration adds columns for comprehensive Veriff data storage

-- Add person data columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "veriffPersonPlaceOfBirth" TEXT,
ADD COLUMN IF NOT EXISTS "veriffPersonCitizenships" JSONB,
ADD COLUMN IF NOT EXISTS "veriffPepSanctionMatches" JSONB;

-- Add document data columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "veriffDocumentIssuedBy" TEXT,
ADD COLUMN IF NOT EXISTS "veriffDocumentFirstIssue" JSONB,
ADD COLUMN IF NOT EXISTS "veriffDocumentPlaceOfIssue" JSONB,
ADD COLUMN IF NOT EXISTS "veriffDocumentProcessNumber" JSONB,
ADD COLUMN IF NOT EXISTS "veriffDocumentResidencePermitType" JSONB,
ADD COLUMN IF NOT EXISTS "veriffDocumentLicenseNumber" JSONB;

-- Add verification results columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "veriffFaceMatchSimilarity" DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS "veriffFaceMatchStatus" TEXT,
ADD COLUMN IF NOT EXISTS "veriffQualityScore" TEXT,
ADD COLUMN IF NOT EXISTS "veriffFlags" JSONB,
ADD COLUMN IF NOT EXISTS "veriffContext" TEXT,
ADD COLUMN IF NOT EXISTS "veriffInsights" JSONB;

-- Add metadata columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "veriffAttemptId" TEXT,
ADD COLUMN IF NOT EXISTS "veriffFeature" TEXT,
ADD COLUMN IF NOT EXISTS "veriffCode" INTEGER,
ADD COLUMN IF NOT EXISTS "veriffReason" TEXT,
ADD COLUMN IF NOT EXISTS "veriffCreatedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "veriffUpdatedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "veriffSubmittedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "veriffDeclinedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "veriffWebhookReceivedAt" TIMESTAMPTZ;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_veriff_session_id ON users("veriffSessionId");
CREATE INDEX IF NOT EXISTS idx_users_veriff_status ON users("veriffStatus");
CREATE INDEX IF NOT EXISTS idx_users_identity_verified ON users("identityVerified");
CREATE INDEX IF NOT EXISTS idx_users_veriff_approved_at ON users("veriffApprovedAt");

-- Add comments for documentation
COMMENT ON COLUMN users."veriffPersonPlaceOfBirth" IS 'Place of birth from Veriff person data';
COMMENT ON COLUMN users."veriffPersonCitizenships" IS 'Array of citizenships from Veriff person data';
COMMENT ON COLUMN users."veriffPepSanctionMatches" IS 'PEP/Sanction check results from Veriff';
COMMENT ON COLUMN users."veriffInsights" IS 'Verification insights and flags from Veriff decision';
COMMENT ON COLUMN users."veriffFaceMatchSimilarity" IS 'Face match similarity score from Veriff';
COMMENT ON COLUMN users."veriffFaceMatchStatus" IS 'Face match status from Veriff';
COMMENT ON COLUMN users."veriffQualityScore" IS 'Document quality score from Veriff';
COMMENT ON COLUMN users."veriffFlags" IS 'Verification flags from Veriff';
COMMENT ON COLUMN users."veriffContext" IS 'Verification context from Veriff';
COMMENT ON COLUMN users."veriffAttemptId" IS 'Veriff attempt ID for tracking multiple attempts';
COMMENT ON COLUMN users."veriffFeature" IS 'Veriff feature used (e.g., selfid)';
COMMENT ON COLUMN users."veriffCode" IS 'Veriff response code';
COMMENT ON COLUMN users."veriffReason" IS 'Veriff decision reason';
COMMENT ON COLUMN users."veriffCreatedAt" IS 'Veriff session creation timestamp';
COMMENT ON COLUMN users."veriffUpdatedAt" IS 'Veriff session last update timestamp';
COMMENT ON COLUMN users."veriffSubmittedAt" IS 'Veriff verification submission timestamp';
COMMENT ON COLUMN users."veriffDeclinedAt" IS 'Veriff verification decline timestamp';
COMMENT ON COLUMN users."veriffWebhookReceivedAt" IS 'Timestamp when webhook was received';