export interface ExamRow {
  id: string;
  student_name: string;
  subject: string;
  exam_url: string;
  class: string;
  locked: boolean;
  unlocks_at: string | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  student_name: string;
  subject: string;
  exam_url: string;
  class: string;
  started_at: string;
  violation_count: number;
  blocked: boolean;
  device_id: string;
  is_locked_at_start: boolean;
  is_active: boolean;
}

const EXAMS_KEY = "lovable_exams";
const SESSIONS_KEY = "lovable_sessions";

const parseStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const saveStorage = <T>(key: string, data: T) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
};

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const createExamRow = (row: Partial<ExamRow>) => ({
  id: row.id || generateId(),
  student_name: row.student_name?.trim() || "",
  subject: row.subject?.trim() || "",
  exam_url: row.exam_url?.trim() || "",
  class: row.class?.trim() || "",
  locked: row.locked ?? false,
  unlocks_at: row.unlocks_at ?? null,
  created_at: row.created_at || new Date().toISOString(),
});

const createSessionRow = (row: Partial<SessionRow>) => ({
  id: row.id || generateId(),
  student_name: row.student_name?.trim() || "",
  subject: row.subject?.trim() || "",
  exam_url: row.exam_url?.trim() || "",
  class: row.class?.trim() || "",
  started_at: row.started_at || new Date().toISOString(),
  violation_count: row.violation_count ?? 0,
  blocked: row.blocked ?? false,
  device_id: row.device_id || "",
  is_locked_at_start: row.is_locked_at_start ?? false,
  is_active: row.is_active ?? true,
});

export const db = {
  getAllExams: async (): Promise<ExamRow[]> => {
    const exams = parseStorage<ExamRow[]>(EXAMS_KEY, []);
    return exams.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  getAllSessions: async (): Promise<SessionRow[]> => {
    const sessions = parseStorage<SessionRow[]>(SESSIONS_KEY, []);
    return sessions.slice().sort((a, b) => b.started_at.localeCompare(a.started_at));
  },

  insertExams: async (rows: Partial<ExamRow>[]): Promise<ExamRow[]> => {
    const exams = parseStorage<ExamRow[]>(EXAMS_KEY, []);
    const newRows = rows.map(createExamRow);
    saveStorage(EXAMS_KEY, [...exams, ...newRows]);
    return newRows;
  },

  deleteExam: async (id: string): Promise<void> => {
    const exams = parseStorage<ExamRow[]>(EXAMS_KEY, []);
    saveStorage(EXAMS_KEY, exams.filter((exam) => exam.id !== id));
  },

  deleteAllExams: async (): Promise<void> => {
    saveStorage(EXAMS_KEY, []);
  },

  updateExam: async (id: string, updates: Partial<ExamRow>): Promise<ExamRow | null> => {
    const exams = parseStorage<ExamRow[]>(EXAMS_KEY, []);
    const updated = exams.map((exam) => (exam.id === id ? { ...exam, ...updates } : exam));
    saveStorage(EXAMS_KEY, updated);
    return updated.find((exam) => exam.id === id) || null;
  },

  getExamByStudentSubjectClass: async (student_name: string, subject: string, studentClass: string): Promise<ExamRow | null> => {
    const exams = parseStorage<ExamRow[]>(EXAMS_KEY, []);
    return (
      exams.find(
        (exam) =>
          exam.student_name.toLowerCase() === student_name.toLowerCase() &&
          exam.subject.toLowerCase() === subject.toLowerCase() &&
          exam.class.toLowerCase() === studentClass.toLowerCase(),
      ) || null
    );
  },

  insertSession: async (row: Partial<SessionRow>): Promise<SessionRow> => {
    const sessions = parseStorage<SessionRow[]>(SESSIONS_KEY, []);
    const newRow = createSessionRow(row);
    saveStorage(SESSIONS_KEY, [...sessions, newRow]);
    return newRow;
  },

  updateSession: async (id: string, updates: Partial<SessionRow>): Promise<SessionRow | null> => {
    const sessions = parseStorage<SessionRow[]>(SESSIONS_KEY, []);
    const updated = sessions.map((session) => (session.id === id ? { ...session, ...updates } : session));
    saveStorage(SESSIONS_KEY, updated);
    return updated.find((session) => session.id === id) || null;
  },

  deleteSession: async (id: string): Promise<void> => {
    const sessions = parseStorage<SessionRow[]>(SESSIONS_KEY, []);
    saveStorage(SESSIONS_KEY, sessions.filter((session) => session.id !== id));
  },

  getSessionById: async (id: string): Promise<SessionRow | null> => {
    const sessions = parseStorage<SessionRow[]>(SESSIONS_KEY, []);
    return sessions.find((session) => session.id === id) || null;
  },

  getSessionByStudentSubjectClass: async (student_name: string, subject: string, studentClass: string): Promise<SessionRow | null> => {
    const sessions = parseStorage<SessionRow[]>(SESSIONS_KEY, []);
    return (
      sessions.find(
        (session) =>
          session.student_name.toLowerCase() === student_name.toLowerCase() &&
          session.subject.toLowerCase() === subject.toLowerCase() &&
          session.class.toLowerCase() === studentClass.toLowerCase(),
      ) || null
    );
  },

  getActiveSessionByStudentName: async (student_name: string): Promise<SessionRow | null> => {
    const sessions = parseStorage<SessionRow[]>(SESSIONS_KEY, []);
    return sessions.find((session) => session.student_name.toLowerCase() === student_name.toLowerCase() && session.is_active) || null;
  },
};
