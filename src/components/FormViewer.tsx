import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, AlertTriangle, RotateCcw } from "lucide-react";

interface FormViewerProps {
  url: string;
  onVisibilityViolation: () => void;
  violationCount: number;
  maxViolations: number;
}

const FormViewer = ({ url, onVisibilityViolation, violationCount, maxViolations }: FormViewerProps) => {
  const [showWarning, setShowWarning] = useState(false);
  const wasHiddenRef = useRef(false);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      wasHiddenRef.current = true;
    } else if (wasHiddenRef.current) {
      wasHiddenRef.current = false;
      setShowWarning(true);
    }
  }, []);

  // Also detect window blur (split screen, app switch)
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!document.hasFocus()) {
        setShowWarning(true);
      }
    }, 500);
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [handleVisibilityChange, handleBlur]);

  const handleRescan = () => {
    setShowWarning(false);
    onVisibilityViolation();
  };

  // Convert Google Form URL to embeddable
  const getEmbedUrl = (formUrl: string) => {
    if (formUrl.includes("/viewform")) {
      return formUrl;
    }
    if (formUrl.includes("forms.gle")) {
      return formUrl;
    }
    return formUrl.includes("?") ? formUrl : formUrl + "?embedded=true";
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
            Anda terdeteksi meninggalkan halaman formulir. Ini tidak diperbolehkan.
          </p>
          <div className="rounded-lg bg-warning/10 border border-warning/30 px-4 py-3 mb-6">
            <p className="text-warning text-sm font-medium">
              Pelanggaran: {violationCount + 1} / {maxViolations}
            </p>
            {violationCount + 1 >= maxViolations && (
              <p className="text-warning/80 text-xs mt-1">
                Ini adalah pelanggaran terakhir. Jawaban akan otomatis disubmit!
              </p>
            )}
          </div>
          <button
            onClick={handleRescan}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Scan Ulang QR Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Security bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-secondary border-b border-border shrink-0">
        <Shield className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-secondary-foreground truncate flex-1">
          Mode Aman Aktif
        </span>
        <span className="text-xs text-muted-foreground">
          {violationCount}/{maxViolations}
        </span>
      </div>

      {/* Form iframe */}
      <iframe
        src={getEmbedUrl(url)}
        className="flex-1 w-full border-none bg-foreground"
        title="Google Form"
        allow="camera; microphone"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
};

export default FormViewer;
