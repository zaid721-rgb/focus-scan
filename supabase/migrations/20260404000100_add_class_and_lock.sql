-- Add class and lock functionality to exams table
alter table public.exams
  add column if not exists class text not null default 'Default',
  add column if not exists locked boolean not null default false,
  add column if not exists unlocks_at timestamptz;

-- Add class to exam_sessions for logging
alter table public.exam_sessions
  add column if not exists class text,
  add column if not exists is_locked_at_start boolean not null default false;

-- Index for faster lock/class queries
create index if not exists exams_locked_idx on public.exams (locked, unlocks_at);
create index if not exists exams_class_idx on public.exams (class);

-- Policy updates
drop policy if exists "Anyone can update exams" on public.exams;
create policy "Anyone can update exams" on public.exams for update to public using (true);
