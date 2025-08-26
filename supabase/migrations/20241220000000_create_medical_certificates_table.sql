-- Create medical_certificates table
CREATE TABLE IF NOT EXISTS medical_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES pilot_documents(id) ON DELETE SET NULL,
  
  -- Certificate archiving fields
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'expired')),
  version INTEGER NOT NULL DEFAULT 1,
  archived_at TIMESTAMP WITH TIME ZONE,
  archive_reason TEXT,
  
  -- Certificate Details
  licensing_authority TEXT NOT NULL, -- EASA country
  medical_class TEXT NOT NULL, -- Class 1 or Class 2
  certificate_number TEXT NOT NULL,
  valid_until DATE NOT NULL,
  
  -- Additional Information
  issued_date DATE,
  issuing_doctor TEXT,
  medical_center TEXT,
  restrictions TEXT,
  remarks TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_medical_certificates_user_id ON medical_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_status ON medical_certificates(status);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_valid_until ON medical_certificates(valid_until);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_document_id ON medical_certificates(document_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_medical_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_medical_certificates_updated_at
  BEFORE UPDATE ON medical_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_certificates_updated_at();

-- Create function to automatically increment version when archiving
CREATE OR REPLACE FUNCTION archive_medical_certificate()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changing to archived, increment version
  IF NEW.status = 'archived' AND OLD.status != 'archived' THEN
    NEW.version = OLD.version + 1;
    NEW.archived_at = NOW();
  END IF;
  
  -- If status is changing to active, reset archived fields
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    NEW.archived_at = NULL;
    NEW.archive_reason = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_archive_medical_certificate
  BEFORE UPDATE ON medical_certificates
  FOR EACH ROW
  EXECUTE FUNCTION archive_medical_certificate();

-- Enable RLS
ALTER TABLE medical_certificates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own medical certificates" ON medical_certificates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medical certificates" ON medical_certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical certificates" ON medical_certificates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medical certificates" ON medical_certificates
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON medical_certificates TO authenticated;
