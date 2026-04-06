import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, AlertTriangle, RotateCcw, ExternalLink, Loader2, BellOff } from "lucide-react";

interface FormViewerProps {
  url: string;
  onVisibilityViolation: () => void;
  violationCount: number;
  maxViolations: number;
}

const FormViewer = ({ url, onVisibilityViolation, violationCount, maxViolations }: FormViewerProps) => {
  const [showWarning, setShowWarning] = useState(false);
  const [showDndReminder, setShowDndReminder] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const wasHiddenRef = useRef(false);
  const iframeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      wasHiddenRef.current = true;
    } else if (wasHiddenRef.current) {
      wasHiddenRef.current = false;
      setShowWarning(true);
    }
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!document.hasFocus()) {
        setShowWarning(true);
      }
    }, 200);
  }, []);

  const windowSizeRef = useRef({ w: window.innerWidth, h: window.innerHeight });
  const handleResize = useCallback(() => {
    const { w, h } = windowSizeRef.current;
    const newW = window.innerWidth;
    const newH = window.innerHeight;
    if (Math.abs(newW - w) > 50 || Math.abs(newH - h) > 80) {
      setShowWarning(true);
    }
    windowSizeRef.current = { w: newW, h: newH };
  }, []);

  const handlePiP = useCallback(() => {
    setShowWarning(true);
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("resize", handleResize);
    document.addEventListener("enterpictureinpicture", handlePiP);
    window.addEventListener("touchstart", () => {}, { passive: true });

    // Aggressive focus check every 800ms
    const focusInterval = setInterval(() => {
      if (!document.hasFocus() && !document.hidden) {
        setShowWarning(true);
      }
    }, 800);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("enterpictureinpicture", handlePiP);
      clearInterval(focusInterval);
    };
  }, [handleVisibilityChange, handleBlur, handleResize, handlePiP]);

  // Auto-fallback: if iframe doesn't load in 6 seconds, show error state
  useEffect(() => {
    if (iframeLoading) {
      iframeTimeoutRef.current = setTimeout(() => {
        setIframeLoading(false);
        setIframeError(true);
      }, 6000);
    }
    return () => {
      if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current);
    };
  }, [iframeLoading]);

  const handleIframeLoad = () => {
    setIframeLoading(false);
    if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current);
  };

  const handleRescan = () => {
    setShowWarning(false);
    onVisibilityViolation();
  };

  const getEmbedUrl = (rawUrl: string) => {
    if (rawUrl.includes("docs.google.com/forms") || rawUrl.includes("forms.gle")) {
      return rawUrl.includes("?") ? `${rawUrl}&embedded=true` : `${rawUrl}?embedded=true`;
    }
    if (rawUrl.includes("docs.google.com/document")) {
      return rawUrl.replace(/\/edit.*$/, "/preview");
    }
    if (rawUrl.includes("docs.google.com/spreadsheets")) {
      return rawUrl.replace(/\/edit.*$/, "/preview");
    }
    if (rawUrl.includes("docs.google.com/presentation")) {
      return rawUrl.replace(/\/edit.*$/, "/embed?start=false&loop=false&delayms=3000");
    }
    // Google Drive file — use /preview directly (more reliable on mobile)
    if (rawUrl.includes("drive.google.com/file")) {
      return rawUrl.replace(/\/view.*$/, "/preview");
    }
    if (rawUrl.toLowerCase().endsWith(".pdf") || rawUrl.includes("/pdf")) {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  };

  const getLinkType = (rawUrl: string): string => {
    if (rawUrl.includes("docs.google.com/forms") || rawUrl.includes("forms.gle")) return "Google Form";
    if (rawUrl.includes("docs.google.com/document")) return "Google Docs";
    if (rawUrl.includes("docs.google.com/spreadsheets")) return "Google Sheets";
    if (rawUrl.includes("docs.google.com/presentation")) return "Google Slides";
    if (rawUrl.includes("drive.google.com/file")) return "Google Drive File";
    if (rawUrl.includes("drive.google.com")) return "Google Drive";
    if (rawUrl.toLowerCase().endsWith(".pdf") || rawUrl.includes("/pdf")) return "PDF";
    return "Dokumen";
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank");
  };

  if (showWarning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Pelanggaran Terdeteksi!</h2>
          <p className="text-muted-foreground text-sm mb-2">
            Anda terdeteksi meninggalkan halaman ujian. Ini tidak diperbolehkan.
          </p>
          <div className="rounded-lg bg-warning/10 border border-warning/30 px-4 py-3 mb-6">
            <p className="text-warning text-sm font-medium">
              Pelanggaran: {violationCount + 1} / {maxViolations}
            </p>
            {violationCount + 1 >= maxViolations && (
              <p className="text-warning/80 text-xs mt-1">
                Ini adalah pelanggaran terakhir. Akses akan diblokir!
              </p>
            )}
          </div>
          <button
            onClick={handleRescan}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* DND Reminder overlay */}
      {showDndReminder && (
        <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Aktifkan Mode Senyap</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Sebelum memulai ujian, aktifkan mode <strong>Jangan Ganggu (DND)</strong> atau <strong>Mode Pesawat</strong> di HP Anda agar notifikasi tidak mengganggu dan terdeteksi sebagai pelanggaran.
            </p>
            <div className="rounded-lg bg-warning/10 border border-warning/30 px-4 py-3 mb-6">
              <p className="text-warning text-xs font-medium">
                ⚠️ Membuka notifikasi, membalas chat, atau keluar dari halaman ini akan dihitung sebagai pelanggaran!
              </p>
            </div>
            <button
              onClick={() => setShowDndReminder(false)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              Saya Sudah Aktifkan, Mulai Ujian
            </button>
          </div>
        </div>
      )}

      {/* Security bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-secondary border-b border-border shrink-0">
        <Shield className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-secondary-foreground truncate flex-1">
          Mode Aman — {getLinkType(url)}
        </span>
        <span className="text-xs text-muted-foreground">
          {violationCount}/{maxViolations}
        </span>
      </div>

      {/* Fallback button for mobile PDF issues */}
      {(url.includes("drive.google.com/file") || url.toLowerCase().includes(".pdf")) && (
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/50 border-b border-border shrink-0">
          <span className="text-xs text-muted-foreground flex-1">Dokumen tidak muncul?</span>
          <button
            onClick={handleOpenExternal}
            className="inline-flex items-center gap-1 text-xs text-primary font-medium"
          >
            <ExternalLink className="w-3 h-3" />
            Buka di tab baru
          </button>
        </div>
      )}

      {/* Loading spinner */}
      {iframeLoading && (
        <div className="flex items-center justify-center py-8 shrink-0">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Memuat dokumen...</span>
        </div>
      )}

      {/* Form iframe */}
      <iframe
        src={getEmbedUrl(url)}
        className={`flex-1 w-full border-none bg-background ${iframeLoading ? "hidden" : ""}`}
        title={getLinkType(url)}
        allow="camera; microphone"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        onLoad={handleIframeLoad}
        onError={() => {
          setIframeError(true);
          setIframeLoading(false);
        }}
      />

      {iframeError && (
        <div className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">Gagal memuat dokumen</p>
          <button onClick={handleOpenExternal} className="text-primary text-sm font-medium inline-flex items-center gap-1">
            <ExternalLink className="w-4 h-4" /> Buka di tab baru
          </button>
        </div>
      )}
    </div>
  );
};

export default FormViewer;
