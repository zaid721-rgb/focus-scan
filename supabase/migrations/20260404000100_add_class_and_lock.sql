-- Add class and lock functionality to exams table
alter table public.exams
  add column if not exists class text not null default 'Default',
  add column if not exists locked boolean not null default false,
  add column if not exists unlocks_at timestamptz;

-- Add class to exam_sessions for logging
alter table public.exam_sessions
  add column if not exists class text,
  add column if not exists is_locked_at_start boolean not null default false,
  add column if not exists device_id text,
  add column if not exists is_active boolean not null default true;

-- Index for faster lock/class queries and device session tracking
create index if not exists exams_locked_idx on public.exams (locked, unlocks_at);
create index if not exists exams_class_idx on public.exams (class);
create index if not exists exam_sessions_student_active_idx on public.exam_sessions (student_name, is_active);
create index if not exists exam_sessions_device_idx on public.exam_sessions (device_id, is_active);

-- Policy updates
drop policy if exists "Anyone can update exams" on public.exams;
create policy "Anyone can update exams" on public.exams for update to public using (true);

-- Policies for exam_sessions (no auth required for this app)
drop policy if exists "Anyone can select exam_sessions" on public.exam_sessions;
create policy "Anyone can select exam_sessions" on public.exam_sessions for select to public using (true);

drop policy if exists "Anyone can insert exam_sessions" on public.exam_sessions;
create policy "Anyone can insert exam_sessions" on public.exam_sessions for insert to public with check (true);

drop policy if exists "Anyone can update exam_sessions" on public.exam_sessions;
create policy "Anyone can update exam_sessions" on public.exam_sessions for update to public using (true);

drop policy if exists "Anyone can delete exam_sessions" on public.exam_sessions;
create policy "Anyone can delete exam_sessions" on public.exam_sessions for delete to public using (true);
