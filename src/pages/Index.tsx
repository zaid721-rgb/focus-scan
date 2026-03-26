import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import EmailLogin from "@/components/EmailLogin";
import QRScanner from "@/components/QRScanner";
import FormViewer from "@/components/FormViewer";
import AdminPanel from "@/components/AdminPanel";

const ADMIN_EMAIL = "zaid721@guru.smp.belajar.id";

type AppState = "login" | "scanning" | "viewing" | "blocked";

const MAX_VIOLATIONS = 2;

const Index = () => {
  const [state, setState] = useState<AppState>("login");
  const [userEmail, setUserEmail] = useState<string>("");
  const [formUrl, setFormUrl] = useState<string>("");
  const [violationCount, setViolationCount] = useState(0);
  const [blockedUrl, setBlockedUrl] = useState<string>("");
  const lastScannedUrl = useRef<string>("");
  const urlViolationMap = useRef<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  // Load violations from DB for the logged-in email
  const loadViolations = useCallback(async (email: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("url_violations")
      .select("form_url, violation_count, blocked")
      .eq("user_email", email);

    const map = new Map<string, number>();
    if (data) {
      data.forEach((row: any) => {
        map.set(row.form_url, row.violation_count);
      });
    }
    urlViolationMap.current = map;
    setLoading(false);
  }, []);

  // Check stored email on mount and detect reload-during-viewing
  useEffect(() => {
    const stored = localStorage.getItem("scanner_user_email");
    if (stored) {
      setUserEmail(stored);
      loadViolations(stored).then(() => {
        const viewingUrl = localStorage.getItem("scanner_viewing_url");
        if (viewingUrl) {
          // User reloaded while viewing a form — count as violation
          localStorage.removeItem("scanner_viewing_url");
          const currentViolations = urlViolationMap.current.get(viewingUrl) || 0;
          const newCount = currentViolations + 1;
          urlViolationMap.current.set(viewingUrl, newCount);

          // Persist violation to DB
          (async () => {
            const { data: existing } = await supabase
              .from("url_violations")
              .select("id")
              .eq("user_email", stored)
              .eq("form_url", viewingUrl)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("url_violations")
                .update({ violation_count: newCount, blocked: newCount >= MAX_VIOLATIONS })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("url_violations")
                .insert({ user_email: stored, form_url: viewingUrl, violation_count: newCount, blocked: newCount >= MAX_VIOLATIONS });
            }
          })();

          if (newCount >= MAX_VIOLATIONS) {
            setBlockedUrl(viewingUrl);
            setViolationCount(newCount);
            setState("blocked");
          } else {
            setViolationCount(newCount);
            setState("scanning");
          }
        } else {
          setState("scanning");
        }
      });
    }
  }, [loadViolations]);

  const handleLogin = useCallback(async (email: string) => {
    setUserEmail(email);
    localStorage.setItem("scanner_user_email", email);
    await loadViolations(email);
    setState("scanning");
  }, [loadViolations]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("scanner_user_email");
    setUserEmail("");
    urlViolationMap.current = new Map();
    setState("login");
  }, []);

  const handleScan = useCallback((url: string) => {
    const currentViolations = urlViolationMap.current.get(url) || 0;

    if (currentViolations >= MAX_VIOLATIONS) {
      setBlockedUrl(url);
      setState("blocked");
      return;
    }

    lastScannedUrl.current = url;
    setFormUrl(url);
    setViolationCount(currentViolations);
    localStorage.setItem("scanner_viewing_url", url);
    setState("viewing");
  }, []);

  const handleViolation = useCallback(async () => {
    const url = lastScannedUrl.current;
    const current = urlViolationMap.current.get(url) || 0;
    const newCount = current + 1;
    urlViolationMap.current.set(url, newCount);
    setViolationCount(newCount);

    // Persist to database
    const { data: existing } = await supabase
      .from("url_violations")
      .select("id")
      .eq("user_email", userEmail)
      .eq("form_url", url)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("url_violations")
        .update({ violation_count: newCount, blocked: newCount >= MAX_VIOLATIONS })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("url_violations")
        .insert({ user_email: userEmail, form_url: url, violation_count: newCount, blocked: newCount >= MAX_VIOLATIONS });
    }

    localStorage.removeItem("scanner_viewing_url");

    if (newCount >= MAX_VIOLATIONS) {
      setBlockedUrl(url);
      setState("blocked");
    } else {
      setState("scanning");
    }
  }, [userEmail]);

  const handleBackToScanner = useCallback(() => {
    localStorage.removeItem("scanner_viewing_url");
    setState("scanning");
    setFormUrl("");
    setBlockedUrl("");
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state === "login") {
    return <EmailLogin onLogin={handleLogin} />;
  }

  if (userEmail === ADMIN_EMAIL) {
    return <AdminPanel userEmail={userEmail} onLogout={handleLogout} />;
  }

  if (state === "blocked") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Link Diblokir</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Anda telah melanggar batas maksimal ({MAX_VIOLATIONS}x) meninggalkan halaman.
            Link formulir ini telah diblokir dan tidak dapat diakses lagi.
          </p>
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 mb-4">
            <p className="text-destructive text-xs font-mono break-all">{blockedUrl}</p>
          </div>
          <div className="rounded-lg bg-secondary border border-border px-4 py-3 mb-6">
            <p className="text-muted-foreground text-xs">
              Login sebagai: <span className="text-foreground font-medium">{userEmail}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleBackToScanner}
              className="flex-1 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm"
            >
              Kembali ke Scanner
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive font-medium text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "viewing" && formUrl) {
    return (
      <FormViewer
        url={formUrl}
        onVisibilityViolation={handleViolation}
        violationCount={violationCount}
        maxViolations={MAX_VIOLATIONS}
      />
    );
  }

  return (
    <QRScanner
      onScan={handleScan}
      urlViolationMap={urlViolationMap.current}
      maxViolations={MAX_VIOLATIONS}
      userEmail={userEmail}
      onLogout={handleLogout}
    />
  );
};

export default Index;
