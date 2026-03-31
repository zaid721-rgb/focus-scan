-- Optimasi pencarian nama siswa dan mata pelajaran pada halaman login.
create index if not exists exams_student_subject_lookup_idx
  on public.exams (lower(student_name), lower(subject));

create index if not exists exams_subject_lookup_idx
  on public.exams (lower(subject));

create index if not exists exam_sessions_student_subject_lookup_idx
  on public.exam_sessions (lower(student_name), lower(subject));
