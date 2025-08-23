-- Create pilot_documents table for storing document metadata
CREATE TABLE IF NOT EXISTS pilot_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('pilot_license', 'medical_certificate', 'radio_certificate')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pilot_licenses table for detailed license information
CREATE TABLE IF NOT EXISTS pilot_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES pilot_documents(id) ON DELETE CASCADE,
    
    -- Holder Information (some fields already in users table)
    place_of_birth TEXT,
    nationality TEXT,
    
    -- License Details
    state_of_issue TEXT NOT NULL,
    issuing_authority TEXT NOT NULL,
    license_number TEXT NOT NULL,
    license_type TEXT NOT NULL, -- e.g., PPL(A), CPL(A), ATPL(A)
    date_of_initial_issue DATE NOT NULL,
    country_code_of_initial_issue TEXT NOT NULL,
    date_of_issue DATE NOT NULL,
    issuing_officer_name TEXT,
    issuing_authority_seal TEXT, -- URL to seal/stamp image
    
    -- Ratings & Privileges (stored as JSON for flexibility)
    class_type_ratings JSONB, -- Array of objects with rating, valid_until, remarks
    ir_valid_until DATE,
    
    -- Language Proficiency
    language_proficiency JSONB, -- Array of objects with language, level, validity_expiry
    
    -- Medical Requirements
    medical_class_required TEXT,
    medical_certificate_expiry DATE,
    
    -- Radio Telephony
    radiotelephony_languages JSONB, -- Array of languages
    radiotelephony_remarks TEXT,
    
    -- Signatures
    holder_signature_present BOOLEAN DEFAULT false,
    examiner_signatures JSONB, -- Array of examiner signature data
    
    -- Additional Information
    icao_compliant BOOLEAN DEFAULT true,
    abbreviations_reference TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pilot_documents_user_id ON pilot_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_pilot_documents_type ON pilot_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_pilot_documents_active ON pilot_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_pilot_licenses_user_id ON pilot_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_pilot_licenses_document_id ON pilot_licenses(document_id);
CREATE INDEX IF NOT EXISTS idx_pilot_licenses_license_number ON pilot_licenses(license_number);

-- Create RLS policies
ALTER TABLE pilot_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_licenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for pilot_documents
CREATE POLICY "Users can view their own pilot documents" ON pilot_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pilot documents" ON pilot_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pilot documents" ON pilot_documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pilot documents" ON pilot_documents
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for pilot_licenses
CREATE POLICY "Users can view their own pilot licenses" ON pilot_licenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pilot licenses" ON pilot_licenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pilot licenses" ON pilot_licenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pilot licenses" ON pilot_licenses
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_pilot_documents_updated_at 
    BEFORE UPDATE ON pilot_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pilot_licenses_updated_at 
    BEFORE UPDATE ON pilot_licenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
