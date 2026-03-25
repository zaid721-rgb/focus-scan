-- Create table to store URL violations per user email
CREATE TABLE public.url_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  form_url TEXT NOT NULL,
  violation_count INTEGER NOT NULL DEFAULT 0,
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_email, form_url)
);

-- Enable RLS
ALTER TABLE public.url_violations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/write (no auth, just email-based tracking)
CREATE POLICY "Anyone can read violations" ON public.url_violations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert violations" ON public.url_violations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update violations" ON public.url_violations FOR UPDATE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_url_violations_updated_at
  BEFORE UPDATE ON public.url_violations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();