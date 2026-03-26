import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Trash2, RefreshCw, LogOut } from "lucide-react";

interface AdminPanelProps {
  userEmail: string;
  onLogout: () => void;
}

interface ViolationRow {
  id: string;
  user_email: string;
  form_url: string;
  violation_count: number;
  blocked: boolean;
}

const AdminPanel = ({ userEmail, onLogout }: AdminPanelProps) => {
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("url_violations")
      .select("*")
      .order("updated_at", { ascending: false });
    setViolations((data as ViolationRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const handleReset = async (id: string) => {
    await supabase
      .from("url_violations")
      .update({ violation_count: 0, blocked: false })
      .eq("id", id);
    fetchViolations();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("url_violations").delete().eq("id", id);
    fetchViolations();
  };

  const groupedByEmail = violations.reduce<Record<string, ViolationRow[]>>((acc, v) => {
    if (!acc[v.user_email]) acc[v.user_email] = [];
    acc[v.user_email].push(v);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground text-xs">{userEmail}</p>
          </div>
          <button
            onClick={fetchViolations}
            className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : violations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Belum ada data pelanggaran.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByEmail).map(([email, rows]) => (
              <div key={email} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-secondary border-b border-border">
                  <p className="text-sm font-medium text-foreground">{email}</p>
                </div>
                <div className="divide-y divide-border">
                  {rows.map((row) => (
                    <div key={row.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {row.form_url}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-foreground">
                            Pelanggaran: {row.violation_count}
                          </span>
                          {row.blocked && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                              DIBLOKIR
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleReset(row.id)}
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Reset pelanggaran"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Hapus record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
