import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ArrowRight, User } from "lucide-react";

interface StudentLoginProps {
  onStart: (studentName: string, subject: string, examUrl: string) => void;
}

const StudentLogin = ({ onStart }: StudentLoginProps) => {
  const [students, setStudents] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("exams").select("student_name, subject");
      if (data) {
        const names = [...new Set(data.map((d: any) => d.student_name))].sort();
        const subs = [...new Set(data.map((d: any) => d.subject))].sort();
        setStudents(names);
        setSubjects(subs);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedName) { setError("Pilih nama Anda"); return; }
    if (!selectedSubject) { setError("Pilih mata pelajaran"); return; }

    // Check for admin access
    if (selectedName === "zaid721@guru.smp.belajar.id" && selectedSubject === "TIK") {
      onStart(selectedName, selectedSubject, "__ADMIN__");
      return;
    }

    // Find exam URL
    const { data } = await supabase
      .from("exams")
      .select("exam_url")
      .eq("student_name", selectedName)
      .eq("subject", selectedSubject)
      .maybeSingle();

    if (!data) {
      setError("Tidak ada ujian untuk kombinasi nama dan mata pelajaran ini");
      return;
    }

    setError(null);
    onStart(selectedName, selectedSubject, data.exam_url);
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
            Pilih nama dan mata pelajaran untuk memulai ujian
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nama Siswa</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={selectedName}
                onChange={(e) => { setSelectedName(e.target.value); setError(null); }}
                className="w-full rounded-xl bg-secondary border-2 border-border pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="">-- Pilih nama --</option>
                {students.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mata Pelajaran</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={selectedSubject}
                onChange={(e) => { setSelectedSubject(e.target.value); setError(null); }}
                className="w-full rounded-xl bg-secondary border-2 border-border pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="">-- Pilih mata pelajaran --</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Mulai Ujian
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-muted-foreground text-xs text-center mt-6">
          Jangan tinggalkan halaman saat ujian berlangsung
        </p>
      </div>
    </div>
  );
};

export default StudentLogin;
