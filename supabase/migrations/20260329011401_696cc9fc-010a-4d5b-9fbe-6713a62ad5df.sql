
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  subject text NOT NULL,
  exam_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read exams" ON public.exams FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert exams" ON public.exams FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update exams" ON public.exams FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete exams" ON public.exams FOR DELETE TO public USING (true);

CREATE TABLE public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  subject text NOT NULL,
  exam_url text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  violation_count integer NOT NULL DEFAULT 0,
  blocked boolean NOT NULL DEFAULT false
);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read exam_sessions" ON public.exam_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert exam_sessions" ON public.exam_sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update exam_sessions" ON public.exam_sessions FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete exam_sessions" ON public.exam_sessions FOR DELETE TO public USING (true);
