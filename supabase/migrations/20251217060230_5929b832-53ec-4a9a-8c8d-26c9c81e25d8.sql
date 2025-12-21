-- Create file_shares table for sharing functionality
CREATE TABLE public.file_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('public_link', 'email')),
  share_token TEXT UNIQUE,
  shared_with_email TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;

-- Policies for file_shares
CREATE POLICY "Users can view their own shares"
ON public.file_shares
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create shares for their files"
ON public.file_shares
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shares"
ON public.file_shares
FOR DELETE
USING (auth.uid() = user_id);

-- Public access policy for shared files (anyone with valid token)
CREATE POLICY "Anyone can view public shared files"
ON public.file_shares
FOR SELECT
USING (share_type = 'public_link' AND share_token IS NOT NULL);