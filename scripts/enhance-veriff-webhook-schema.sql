-- Enhanced Veriff Webhook Schema
-- This script adds comprehensive columns to capture all possible Veriff webhook data

-- Add comprehensive Veriff webhook data columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffWebhookData" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffWebhookReceivedAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffWebhookSignature" TEXT;

-- Add detailed verification result columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffPersonGivenName" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffPersonLastName" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffPersonIdNumber" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffPersonDateOfBirth" DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffPersonNationality" VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffPersonGender" VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffPersonCountry" VARCHAR(100);

-- Add document verification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffDocumentType" VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffDocumentNumber" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffDocumentCountry" VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffDocumentValidFrom" DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffDocumentValidUntil" DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffDocumentIssuedBy" VARCHAR(255);

-- Add face verification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffFaceMatchSimilarity" DECIMAL(5,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffFaceMatchStatus" VARCHAR(50);

-- Add decision and insights columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffDecisionScore" DECIMAL(5,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffQualityScore" VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffFlags" TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffContext" TEXT;

-- Add verification metadata
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffVerificationId" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffAttemptId" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffFeature" VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffCode" INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffReason" TEXT;

-- Add timestamps for verification events
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffCreatedAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffUpdatedAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffSubmittedAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffApprovedAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffDeclinedAt" TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN users."veriffWebhookData" IS 'Complete webhook payload from Veriff';
COMMENT ON COLUMN users."veriffWebhookReceivedAt" IS 'Timestamp when webhook was received';
COMMENT ON COLUMN users."veriffWebhookSignature" IS 'Webhook signature for verification';
COMMENT ON COLUMN users."veriffPersonGivenName" IS 'Person first name from verification';
COMMENT ON COLUMN users."veriffPersonLastName" IS 'Person last name from verification';
COMMENT ON COLUMN users."veriffPersonIdNumber" IS 'Person ID number from verification';
COMMENT ON COLUMN users."veriffPersonDateOfBirth" IS 'Person date of birth from verification';
COMMENT ON COLUMN users."veriffPersonNationality" IS 'Person nationality from verification';
COMMENT ON COLUMN users."veriffPersonGender" IS 'Person gender from verification';
COMMENT ON COLUMN users."veriffPersonCountry" IS 'Person country from verification';
COMMENT ON COLUMN users."veriffDocumentType" IS 'Document type from verification';
COMMENT ON COLUMN users."veriffDocumentNumber" IS 'Document number from verification';
COMMENT ON COLUMN users."veriffDocumentCountry" IS 'Document country from verification';
COMMENT ON COLUMN users."veriffDocumentValidFrom" IS 'Document valid from date';
COMMENT ON COLUMN users."veriffDocumentValidUntil" IS 'Document valid until date';
COMMENT ON COLUMN users."veriffDocumentIssuedBy" IS 'Document issuing authority';
COMMENT ON COLUMN users."veriffFaceMatchSimilarity" IS 'Face match similarity score';
COMMENT ON COLUMN users."veriffFaceMatchStatus" IS 'Face match verification status';
COMMENT ON COLUMN users."veriffDecisionScore" IS 'Overall decision score';
COMMENT ON COLUMN users."veriffQualityScore" IS 'Document quality score';
COMMENT ON COLUMN users."veriffFlags" IS 'Verification flags and warnings';
COMMENT ON COLUMN users."veriffContext" IS 'Verification context information';
COMMENT ON COLUMN users."veriffVerificationId" IS 'Veriff verification ID';
COMMENT ON COLUMN users."veriffAttemptId" IS 'Veriff attempt ID';
COMMENT ON COLUMN users."veriffFeature" IS 'Veriff feature used';
COMMENT ON COLUMN users."veriffCode" IS 'Veriff response code';
COMMENT ON COLUMN users."veriffReason" IS 'Reason for verification result';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_veriff_verification_id ON users("veriffVerificationId");
CREATE INDEX IF NOT EXISTS idx_users_veriff_webhook_received_at ON users("veriffWebhookReceivedAt");
CREATE INDEX IF NOT EXISTS idx_users_veriff_status ON users("veriffStatus");
CREATE INDEX IF NOT EXISTS idx_users_identity_verified_at ON users("identityVerifiedAt");

-- Create a function to update verification timestamps
CREATE OR REPLACE FUNCTION update_veriff_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Update veriffUpdatedAt whenever veriff data changes
    NEW."veriffUpdatedAt" = NOW();
    
    -- Set specific timestamps based on status changes
    IF NEW."veriffStatus" = 'submitted' AND OLD."veriffStatus" != 'submitted' THEN
        NEW."veriffSubmittedAt" = NOW();
    END IF;
    
    IF NEW."veriffStatus" = 'approved' AND OLD."veriffStatus" != 'approved' THEN
        NEW."veriffApprovedAt" = NOW();
        NEW."identityVerifiedAt" = NOW();
    END IF;
    
    IF NEW."veriffStatus" = 'declined' AND OLD."veriffStatus" != 'declined' THEN
        NEW."veriffDeclinedAt" = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamps
DROP TRIGGER IF EXISTS trigger_update_veriff_timestamps ON users;
CREATE TRIGGER trigger_update_veriff_timestamps
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_veriff_timestamps(); 