import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
export type SessionRow = Database["public"]["Tables"]["exam_sessions"]["Row"];
export type ExamInsert = Database["public"]["Tables"]["exams"]["Insert"];
export type SessionInsert = Database["public"]["Tables"]["exam_sessions"]["Insert"];
export type ExamUpdate = Database["public"]["Tables"]["exams"]["Update"];
export type SessionUpdate = Database["public"]["Tables"]["exam_sessions"]["Update"];

const createdAt = () => new Date().toISOString();

export const db = {
  getAllExams: async (): Promise<ExamRow[]> => {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getAllExams error:", error);
      return [];
    }

    return data || [];
  },

  getAllSessions: async (): Promise<SessionRow[]> => {
    const { data, error } = await supabase
      .from("exam_sessions")
      .select("*")
      .order("started_at", { ascending: false });

    if (error) {
      console.error("getAllSessions error:", error);
      return [];
    }

    return data || [];
  },

  insertExams: async (rows: Partial<ExamRow>[]): Promise<ExamRow[]> => {
    const payload = rows.map((row) => ({
      ...row,
      created_at: row.created_at || createdAt(),
    })) as ExamInsert[];

    const { data, error } = await supabase.from("exams").insert(payload).select("*");

    if (error) {
      console.error("insertExams error:", error);
      return [];
    }

    return data || [];
  },

  deleteExam: async (id: string): Promise<void> => {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) {
      console.error("deleteExam error:", error);
    }
  },

  deleteAllExams: async (): Promise<void> => {
    const { error } = await supabase.from("exams").delete();
    if (error) {
      console.error("deleteAllExams error:", error);
    }
  },

  updateExam: async (id: string, updates: Partial<ExamUpdate>): Promise<ExamRow | null> => {
    const { data, error } = await supabase
      .from("exams")
      .update(updates)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("updateExam error:", error);
      return null;
    }

    return data;
  },

  getExamByStudentSubjectClass: async (
    student_name: string,
    subject: string,
    studentClass: string,
  ): Promise<ExamRow | null> => {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .eq("student_name", student_name)
      .eq("subject", subject)
      .eq("class", studentClass)
      .maybeSingle();

    if (error) {
      console.error("getExamByStudentSubjectClass error:", error);
      return null;
    }

    return data;
  },

  insertSession: async (row: Partial<SessionInsert>): Promise<SessionRow | null> => {
    const payload = {
      ...row,
      started_at: row.started_at || createdAt(),
    } as SessionInsert;

    const { data, error } = await supabase.from("exam_sessions").insert(payload).select("*").maybeSingle();

    if (error) {
      console.error("insertSession error:", error);
      return null;
    }

    return data;
  },

  updateSession: async (id: string, updates: Partial<SessionUpdate>): Promise<SessionRow | null> => {
    const { data, error } = await supabase
      .from("exam_sessions")
      .update(updates)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("updateSession error:", error);
      return null;
    }

    return data;
  },

  deleteSession: async (id: string): Promise<void> => {
    const { error } = await supabase.from("exam_sessions").delete().eq("id", id);
    if (error) {
      console.error("deleteSession error:", error);
    }
  },

  getSessionById: async (id: string): Promise<SessionRow | null> => {
    const { data, error } = await supabase.from("exam_sessions").select("*").eq("id", id).maybeSingle();

    if (error) {
      console.error("getSessionById error:", error);
      return null;
    }

    return data;
  },

  getSessionByStudentSubjectClass: async (
    student_name: string,
    subject: string,
    studentClass: string,
  ): Promise<SessionRow | null> => {
    const { data, error } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("student_name", student_name)
      .eq("subject", subject)
      .eq("class", studentClass)
      .maybeSingle();

    if (error) {
      console.error("getSessionByStudentSubjectClass error:", error);
      return null;
    }

    return data;
  },

  getActiveSessionByStudentName: async (student_name: string): Promise<SessionRow | null> => {
    const { data, error } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("student_name", student_name)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("getActiveSessionByStudentName error:", error);
      return null;
    }

    return data;
  },
};
