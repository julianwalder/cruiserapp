-- Create storage bucket for pilot documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pilot-documents',
  'pilot-documents',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for pilot-documents bucket
CREATE POLICY "Users can upload their own pilot documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pilot-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own pilot documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pilot-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own pilot documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'pilot-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own pilot documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pilot-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
