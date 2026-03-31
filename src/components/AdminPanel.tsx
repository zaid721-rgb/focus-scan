import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Trash2, RefreshCw, LogOut, Plus, Download, X, Upload } from "lucide-react";

interface AdminPanelProps {
  onLogout: () => void;
}

interface ExamRow {
  id: string;
  student_name: string;
  subject: string;
  exam_url: string;
  created_at: string;
}

interface SessionRow {
  id: string;
  student_name: string;
  subject: string;
  exam_url: string;
  started_at: string;
  violation_count: number;
  blocked: boolean;
}

const AdminPanel = ({ onLogout }: AdminPanelProps) => {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"exams" | "sessions">("exams");
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [addingBulk, setAddingBulk] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [examsRes, sessionsRes] = await Promise.all([
      supabase.from("exams").select("*").order("created_at", { ascending: false }),
      supabase.from("exam_sessions").select("*").order("started_at", { ascending: false }),
    ]);
    setExams((examsRes.data as ExamRow[]) || []);
    setSessions((sessionsRes.data as SessionRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteExam = async (id: string) => {
    await supabase.from("exams").delete().eq("id", id);
    fetchData();
  };

  const handleDeleteAllExams = async () => {
    if (!confirm("Hapus semua data ujian?")) return;
    await supabase.from("exams").delete().not("id", "is", null);
    fetchData();
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;
    setAddingBulk(true);
    const lines = bulkText.trim().split("\n").filter(l => l.trim());
    const rows: { student_name: string; subject: string; exam_url: string }[] = [];

    for (const line of lines) {
      // Format: nama siswa, mata pelajaran, link ujian
      const parts = line.split(",").map(p => p.trim());
      if (parts.length >= 3) {
        rows.push({
          student_name: parts[0],
          subject: parts[1],
          exam_url: parts[2],
        });
      }
    }

    const uniqueRows = Array.from(
      new Map(
        rows.map((row) => [
          `${row.student_name.toLowerCase()}::${row.subject.toLowerCase()}::${row.exam_url}`,
          row,
        ]),
      ).values(),
    );

    if (uniqueRows.length > 0) {
      await supabase.from("exams").insert(uniqueRows);
    }

    setBulkText("");
    setShowBulkAdd(false);
    setAddingBulk(false);
    fetchData();
  };

  const handleDownloadCSV = () => {
    const header = "Waktu Masuk,Nama Siswa,Mata Pelajaran,Jumlah Pelanggaran,Status\n";
    const csvRows = sessions.map(s => {
      const time = new Date(s.started_at).toLocaleString("id-ID");
      const status = s.blocked ? "Diblokir" : "Aktif";
      return `"${time}","${s.student_name}","${s.subject}",${s.violation_count},"${status}"`;
    });
    const csv = header + csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data_login_siswa_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetSession = async (id: string) => {
    await supabase.from("exam_sessions").update({ violation_count: 0, blocked: false }).eq("id", id);
    fetchData();
  };

  const handleDeleteSession = async (id: string) => {
    await supabase.from("exam_sessions").delete().eq("id", id);
    fetchData();
  };

  const groupedExams = exams.reduce<Record<string, ExamRow[]>>((acc, e) => {
    if (!acc[e.subject]) acc[e.subject] = [];
    acc[e.subject].push(e);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground text-xs">Kelola ujian & pantau siswa</p>
          </div>
          <button onClick={fetchData} className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={onLogout} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("exams")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === "exams" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            Data Ujian ({exams.length})
          </button>
          <button
            onClick={() => setTab("sessions")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === "sessions" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            Log Siswa ({sessions.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === "exams" ? (
          <div className="space-y-4">
            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkAdd(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Massal
              </button>
              {exams.length > 0 && (
                <button
                  onClick={handleDeleteAllExams}
                  className="px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive font-medium text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Bulk add modal */}
            {showBulkAdd && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Tambah Data Ujian Massal</h3>
                  <button onClick={() => setShowBulkAdd(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Format per baris: <code className="bg-secondary px-1 rounded">Nama Siswa, Mata Pelajaran, Link Ujian</code>
                </p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Ahmad Fadli, Matematika, https://docs.google.com/forms/d/xxx\nSiti Nurhaliza, Matematika, https://docs.google.com/forms/d/xxx\nBudi Santoso, IPA, https://drive.google.com/file/d/xxx/view`}
                  className="w-full h-40 rounded-lg bg-secondary border border-border p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                />
                <button
                  onClick={handleBulkAdd}
                  disabled={addingBulk || !bulkText.trim()}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {addingBulk ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            )}

            {/* Exams list grouped by subject */}
            {exams.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">Belum ada data ujian. Tambahkan data terlebih dahulu.</p>
              </div>
            ) : (
              Object.entries(groupedExams).map(([subject, rows]) => (
                <div key={subject} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 bg-secondary border-b border-border">
                    <p className="text-sm font-medium text-foreground">📚 {subject}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {rows.map((row) => (
                      <div key={row.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{row.student_name}</p>
                          <p className="text-xs font-mono text-muted-foreground truncate">{row.exam_url}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteExam(row.id)}
                          className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Download CSV */}
            {sessions.length > 0 && (
              <button
                onClick={handleDownloadCSV}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
              >
                <Download className="w-4 h-4" /> Download CSV
              </button>
            )}

            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">Belum ada data login siswa.</p>
              </div>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{s.student_name}</p>
                      <p className="text-xs text-muted-foreground">{s.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(s.started_at).toLocaleString("id-ID")}
                        </span>
                        <span className="text-xs text-foreground">
                          Pelanggaran: {s.violation_count}
                        </span>
                        {s.blocked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                            DIBLOKIR
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleResetSession(s.id)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Reset">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteSession(s.id)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Hapus">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
