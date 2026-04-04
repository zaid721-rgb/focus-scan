import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ArrowRight, User } from "lucide-react";
import { toast } from "sonner";

interface StudentLoginProps {
  onStart: (studentName: string, subject: string, examUrl: string, studentClass?: string) => void;
}

type ExamOption = {
  student_name: string;
  subject: string;
};

const ADMIN_NAME = "zaid721@guru.smp.belajar.id";
const ADMIN_SUBJECT = "TIK";

const normalizeValue = (value: string) => value.trim().toLowerCase();

const StudentLogin = ({ onStart }: StudentLoginProps) => {
  const [examOptions, setExamOptions] = useState<ExamOption[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("exams")
        .select("student_name, subject");

      if (!isMounted) return;

      if (fetchError) {
        setError("Gagal memuat data login dari database.");
        toast.error("Data login dari Supabase gagal dimuat.");
        setLoading(false);
        return;
      }

      const visibleOptions = (data ?? []).filter((row) => {
        return !(
          normalizeValue(row.student_name) === normalizeValue(ADMIN_NAME) &&
          normalizeValue(row.subject) === normalizeValue(ADMIN_SUBJECT)
        );
      });

      setExamOptions(visibleOptions);
      setLoading(false);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const nameSuggestions = useMemo(() => {
    const nameKeyword = normalizeValue(selectedName);
    const subjectKeyword = normalizeValue(selectedSubject);

    if (!nameKeyword) return [];

    return [...new Set(
      examOptions
        .filter((row) => {
          return !subjectKeyword || normalizeValue(row.subject).includes(subjectKeyword);
        })
        .map((row) => row.student_name.trim())
        .filter((name) => name && normalizeValue(name).includes(nameKeyword))
    )]
      .sort((a, b) => a.localeCompare(b, "id-ID"))
      .slice(0, 8);
  }, [examOptions, selectedName, selectedSubject]);

  const subjectSuggestions = useMemo(() => {
    const subjectKeyword = normalizeValue(selectedSubject);
    const nameKeyword = normalizeValue(selectedName);

    if (!subjectKeyword) return [];

    return [...new Set(
      examOptions
        .filter((row) => {
          return !nameKeyword || normalizeValue(row.student_name).includes(nameKeyword);
        })
        .map((row) => row.subject.trim())
        .filter((subject) => subject && normalizeValue(subject).includes(subjectKeyword))
    )]
      .sort((a, b) => a.localeCompare(b, "id-ID"))
      .slice(0, 8);
  }, [examOptions, selectedName, selectedSubject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const typedName = selectedName.trim();
    const typedSubject = selectedSubject.trim();
    const typedClass = selectedClass.trim();

    if (!typedName) {
      const message = "Nama siswa wajib diisi.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!typedSubject) {
      const message = "Mata pelajaran wajib diisi.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!typedClass) {
      const message = "Kelas wajib diisi.";
      setError(message);
      toast.error(message);
      return;
    }

    if (
      normalizeValue(typedName) === normalizeValue(ADMIN_NAME) &&
      normalizeValue(typedSubject) === normalizeValue(ADMIN_SUBJECT)
    ) {
      setError(null);
      onStart(ADMIN_NAME, ADMIN_SUBJECT, "__ADMIN__");
      return;
    }

    const matchedOption = examOptions.find((row) => {
      return (
        normalizeValue(row.student_name) === normalizeValue(typedName) &&
        normalizeValue(row.subject) === normalizeValue(typedSubject)
      );
    });

    if (!matchedOption) {
      const message = "Nama dan mata pelajaran harus dipilih dari rekomendasi data admin.";
      setError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);

    const { data, error: examError } = await supabase
      .from("exams")
      .select("exam_url, locked, unlocks_at")
      .eq("student_name", matchedOption.student_name)
      .eq("subject", matchedOption.subject)
      .eq("class", typedClass)
      .maybeSingle();

    setSubmitting(false);

    if (examError || !data?.exam_url) {
      const message = "Kombinasi nama, mata pelajaran, dan kelas tidak valid. Silakan cek lagi.";
      setError(message);
      toast.error(message);
      return;
    }

    // Check if locked
    if (data.locked) {
      const unlockTime = data.unlocks_at ? new Date(data.unlocks_at).toLocaleString("id-ID") : "belum ditentukan";
      const message = `Ujian ini masih dikunci. Akan dibuka pada: ${unlockTime}`;
      setError(message);
      toast.error(message);
      return;
    }

    setError(null);
    onStart(matchedOption.student_name, matchedOption.subject, data.exam_url, typedClass);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Mulai Ujian</h1>
          <p className="text-muted-foreground text-sm">
            Ketik nama dan mata pelajaran, lalu pilih rekomendasi dari data admin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="student-name" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Nama Siswa
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="student-name"
                list="student-name-suggestions"
                value={selectedName}
                onChange={(e) => {
                  setSelectedName(e.target.value);
                  setError(null);
                }}
                placeholder="Ketik nama siswa"
                autoComplete="off"
                className="w-full rounded-xl bg-secondary border-2 border-border pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <datalist id="student-name-suggestions">
                {nameSuggestions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </datalist>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Rekomendasi nama muncul saat siswa mulai mengetik.
            </p>
          </div>

          <div>
            <label htmlFor="student-subject" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Mata Pelajaran
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="student-subject"
                list="subject-suggestions"
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setError(null);
                }}
                placeholder="Ketik mata pelajaran"
                autoComplete="off"
                className="w-full rounded-xl bg-secondary border-2 border-border pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <datalist id="subject-suggestions">
                {subjectSuggestions.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </datalist>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Nama dan mata pelajaran admin tidak ditampilkan langsung di daftar.
            </p>
          </div>

          <div>
            <label htmlFor="student-class" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Kelas
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="student-class"
                type="text"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setError(null);
                }}
                placeholder="Ketik kelas Anda (contoh: 9A, 9B)"
                autoComplete="off"
                className="w-full rounded-xl bg-secondary border-2 border-border pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
          >
            {submitting ? "Memeriksa data..." : "Mulai Ujian"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-muted-foreground text-xs text-center mt-6">
          Jangan tinggalkan halaman saat ujian berlangsung.
        </p>
      </div>
    </div>
  );
};

export default StudentLogin;
