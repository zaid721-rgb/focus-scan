import { useState, useCallback, useRef } from "react";
import QRScanner from "@/components/QRScanner";
import FormViewer from "@/components/FormViewer";

type AppState = "scanning" | "viewing" | "auto-submitted";

const MAX_VIOLATIONS = 3;

const Index = () => {
  const [state, setState] = useState<AppState>("scanning");
  const [formUrl, setFormUrl] = useState<string>("");
  const [violationCount, setViolationCount] = useState(0);
  const lastScannedUrl = useRef<string>("");
  const urlViolationMap = useRef<Map<string, number>>(new Map());

  const handleScan = useCallback((url: string) => {
    const currentViolations = urlViolationMap.current.get(url) || 0;

    if (currentViolations >= MAX_VIOLATIONS) {
      // Auto-submit: open form with pre-submit parameter
      const submitUrl = url.replace("/viewform", "/formResponse");
      window.open(submitUrl, "_blank");
      setState("auto-submitted");
      return;
    }

    lastScannedUrl.current = url;
    setFormUrl(url);
    setViolationCount(currentViolations);
    setState("viewing");
  }, []);

  const handleViolation = useCallback(() => {
    const url = lastScannedUrl.current;
    const current = urlViolationMap.current.get(url) || 0;
    const newCount = current + 1;
    urlViolationMap.current.set(url, newCount);
    setViolationCount(newCount);
    setState("scanning");
  }, []);

  const handleReset = useCallback(() => {
    setState("scanning");
    setFormUrl("");
    setViolationCount(0);
  }, []);

  if (state === "auto-submitted") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Formulir Otomatis Disubmit</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Anda telah melanggar batas maksimal ({MAX_VIOLATIONS}x) meninggalkan halaman. 
            Jawaban formulir telah otomatis disubmit apa adanya.
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm"
          >
            Kembali ke Scanner
          </button>
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

  return <QRScanner onScan={handleScan} scanCount={violationCount} />;
};

export default Index;
