-- Supabase Storage Setup
-- Create storage buckets and policies for ActScript project

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, '{"image/jpeg","image/png","image/gif","image/webp"}'),
  ('portfolio', 'portfolio', true, 10485760, '{"image/jpeg","image/png","image/gif","image/webp"}'),
  ('demo-reels', 'demo-reels', true, 104857600, '{"video/mp4","video/webm","video/mov","video/avi"}'),
  ('documents', 'documents', false, 20971520, '{"application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"}');

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for portfolio bucket
CREATE POLICY "Anyone can view portfolio images" ON storage.objects 
  FOR SELECT USING (bucket_id = 'portfolio');

CREATE POLICY "Users can upload to their portfolio" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'portfolio' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their portfolio" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'portfolio' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete from their portfolio" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'portfolio' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for demo-reels bucket
CREATE POLICY "Anyone can view demo reels" ON storage.objects 
  FOR SELECT USING (bucket_id = 'demo-reels');

CREATE POLICY "Users can upload their demo reels" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'demo-reels' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their demo reels" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'demo-reels' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their demo reels" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'demo-reels' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for documents bucket (private)
CREATE POLICY "Users can view their own documents" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their documents" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their documents" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their documents" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );