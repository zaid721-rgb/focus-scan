
ALTER TABLE public.exams 
  ADD COLUMN IF NOT EXISTS class text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlocks_at timestamptz;

ALTER TABLE public.exam_sessions 
  ADD COLUMN IF NOT EXISTS class text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS device_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_locked_at_start boolean NOT NULL DEFAULT false;
