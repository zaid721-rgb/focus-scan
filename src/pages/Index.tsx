import { useState, useCallback, useRef, useEffect } from "react";
import { db } from "@/integrations/db";
import { supabase } from "@/integrations/supabase/client";
import StudentLogin from "@/components/StudentLogin";
import FormViewer from "@/components/FormViewer";
import AdminPanel from "@/components/AdminPanel";

type AppState = "login" | "viewing" | "blocked" | "admin";

const MAX_VIOLATIONS = 2;

const notifyTelegram = async (
  type: "violation" | "exam_start",
  studentName: string,
  subject: string,
  examUrl: string,
  violationCount: number,
  blocked: boolean,
  studentClass?: string
) => {
  try {
    console.debug("notifyTelegram", {
      type,
      user_name: studentName,
      subject,
      form_url: examUrl,
      violation_count: violationCount,
      blocked,
      student_class: studentClass,
    });

    await supabase.functions.invoke("notify-violation", {
      body: {
        type,
        user_name: studentName,
        subject,
        form_url: examUrl,
        violation_count: violationCount,
        blocked,
        student_class: studentClass,
      },
    });
  } catch (e) {
    console.error("Telegram notification failed:", e);
  }
};

const Index = () => {
  const [state, setState] = useState<AppState>("login");
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [examUrl, setExamUrl] = useState("");
  const [violationCount, setViolationCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const examUrlRef = useRef("");

  // Check for reload-during-viewing
  useEffect(() => {
    const storedSession = localStorage.getItem("exam_session_id");
    const storedUrl = localStorage.getItem("exam_viewing_url");
    const storedName = localStorage.getItem("exam_student_name");
    const storedSubject = localStorage.getItem("exam_subject");

    if (storedSession && storedUrl) {
      // User reloaded during exam — count as violation
      setLoading(true);
      (async () => {
        const data = await db.getSessionById(storedSession);

        if (data) {
          const newCount = data.violation_count + 1;
          const isBlocked = newCount >= MAX_VIOLATIONS;

          await supabase
            .from("exam_sessions")
            .update({ violation_count: newCount, blocked: isBlocked })
            .eq("id", storedSession);

          await notifyTelegram("violation", storedName || "", storedSubject || "", storedUrl, newCount, isBlocked);

          if (isBlocked) {
            setStudentName(storedName || "");
            setSubject(storedSubject || "");
            setExamUrl(storedUrl);
            setViolationCount(newCount);
            setSessionId(storedSession);
            localStorage.removeItem("exam_viewing_url");
            setState("blocked");
          } else {
            setViolationCount(newCount);
            // Go back to login after reload violation
            localStorage.removeItem("exam_viewing_url");
            localStorage.removeItem("exam_session_id");
            localStorage.removeItem("exam_student_name");
            localStorage.removeItem("exam_subject");
          }
        }
        setLoading(false);
      })();
    }
  }, []);

  const handleStart = useCallback(async (name: string, sub: string, url: string, studentClass?: string, deviceId?: string) => {
    if (url === "__ADMIN__") {
      setStudentName(name);
      setState("admin");
      return;
    }

    setStudentName(name);
    setSubject(sub);
    setStudentClass(studentClass || "");
    setExamUrl(url);
    examUrlRef.current = url;

    // Check existing session for this student+subject+class
    const existing = await db.getSessionByStudentSubjectClass(name, sub, studentClass || "");

    if (existing) {
      if (existing.blocked) {
        setViolationCount(existing.violation_count);
        setSessionId(existing.id);
        setState("blocked");
        return;
      }
      setViolationCount(existing.violation_count);
      setSessionId(existing.id);
    } else {
      // Create new session with device tracking
      const newSession = await db.insertSession({ 
        student_name: name, 
        subject: sub, 
        exam_url: url,
        class: studentClass || "",
        is_locked_at_start: false,
        device_id: deviceId || "",
        is_active: true,
      });

      if (newSession) {
        setSessionId(newSession.id);
      }

      // Notify Telegram about exam start
      await notifyTelegram("exam_start", name, sub, url, 0, false, studentClass);
    }

    localStorage.setItem("exam_viewing_url", url);
    localStorage.setItem("exam_session_id", sessionId || "");
    localStorage.setItem("exam_student_name", name);
    localStorage.setItem("exam_subject", sub);
    localStorage.setItem("exam_student_class", studentClass || "");
    localStorage.setItem("device_id", deviceId || "");
    setState("viewing");
  }, [sessionId]);

  // Fix: store session ID after it's set
  useEffect(() => {
    if (sessionId && state === "viewing") {
      localStorage.setItem("exam_session_id", sessionId);
    }
  }, [sessionId, state]);

  const handleViolation = useCallback(async () => {
    if (!sessionId) return;

    const newCount = violationCount + 1;
    const isBlocked = newCount >= MAX_VIOLATIONS;
    setViolationCount(newCount);

    await db.updateSession(sessionId, { violation_count: newCount, blocked: isBlocked, is_active: false });

    await notifyTelegram("violation", studentName, subject, examUrlRef.current, newCount, isBlocked, studentClass);

    localStorage.removeItem("exam_viewing_url");

    if (isBlocked) {
      setState("blocked");
    } else {
      setState("login");
      localStorage.removeItem("exam_session_id");
      localStorage.removeItem("exam_student_name");
      localStorage.removeItem("exam_subject");
      localStorage.removeItem("exam_student_class");
    }
  }, [sessionId, violationCount, studentName, subject, studentClass]);

  const handleLogout = useCallback(async () => {
    // Mark session as inactive if it exists
    if (sessionId) {
      await db.updateSession(sessionId, { is_active: false });
    }

    localStorage.removeItem("exam_viewing_url");
    localStorage.removeItem("exam_session_id");
    localStorage.removeItem("exam_student_name");
    localStorage.removeItem("exam_subject");
    localStorage.removeItem("exam_student_class");
    localStorage.removeItem("device_id");
    setStudentName("");
    setSubject("");
    setStudentClass("");
    setExamUrl("");
    setSessionId(null);
    setViolationCount(0);
    setState("login");
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state === "admin") {
    return <AdminPanel onLogout={handleLogout} />;
  }

  if (state === "blocked") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Akses Diblokir</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Anda telah melanggar batas maksimal ({MAX_VIOLATIONS}x) meninggalkan halaman ujian.
            Akses ujian ini telah diblokir.
          </p>
          <div className="rounded-lg bg-secondary border border-border px-4 py-3 mb-6">
            <p className="text-muted-foreground text-xs">
              Siswa: <span className="text-foreground font-medium">{studentName}</span>
            </p>
            <p className="text-muted-foreground text-xs">
              Mata Pelajaran: <span className="text-foreground font-medium">{subject}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-xl bg-destructive/10 text-destructive font-medium text-sm"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (state === "viewing" && examUrl) {
    return (
      <FormViewer
        url={examUrl}
        onVisibilityViolation={handleViolation}
        violationCount={violationCount}
        maxViolations={MAX_VIOLATIONS}
      />
    );
  }

  return <StudentLogin onStart={handleStart} />;
};

export default Index;
