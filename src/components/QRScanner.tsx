import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, AlertTriangle, Link, ClipboardPaste } from "lucide-react";

interface QRScannerProps {
  onScan: (url: string) => void;
  urlViolationMap: Map<string, number>;
  maxViolations: number;
}

const QRScanner = ({ onScan, urlViolationMap, maxViolations }: QRScannerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [mode, setMode] = useState<"scan" | "paste">("scan");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>("qr-reader-" + Date.now());

  const isValidFormUrl = (url: string) =>
    url.includes("docs.google.com/forms") || url.includes("forms.gle");

  const isBlocked = (url: string) =>
    (urlViolationMap.get(url) || 0) >= maxViolations;

  const handlePasteSubmit = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) {
      setLinkError("Masukkan link Google Form");
      return;
    }
    if (!isValidFormUrl(trimmed)) {
      setLinkError("Link harus berupa Google Form (docs.google.com/forms atau forms.gle)");
      return;
    }
    if (isBlocked(trimmed)) {
      setLinkError("Link ini telah diblokir karena terlalu banyak pelanggaran.");
      return;
    }
    setLinkError(null);
    onScan(trimmed);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLinkInput(text);
      setLinkError(null);
    } catch {
      setLinkError("Tidak dapat mengakses clipboard. Paste secara manual.");
    }
  };

  const startScanner = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    try {
      const scanner = new Html5Qrcode(containerRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (isValidFormUrl(decodedText)) {
            if (isBlocked(decodedText)) {
              setError("Link ini telah diblokir karena terlalu banyak pelanggaran.");
              scanner.stop().catch(console.error);
              return;
            }
            scanner.stop().catch(console.error);
            onScan(decodedText);
          }
        },
        () => {}
      );
      setIsStarting(false);
    } catch (err) {
      setError("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.");
      setIsStarting(false);
    }
  }, [onScan, urlViolationMap, maxViolations]);

  useEffect(() => {
    startScanner();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, [startScanner]);

  // Show blocked URLs
  const blockedUrls = Array.from(urlViolationMap.entries())
    .filter(([, count]) => count >= maxViolations)
    .map(([url]) => url);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 mb-4">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-secondary-foreground">Secure Form Scanner</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {mode === "scan" ? "Scan QR Code" : "Paste Link"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {mode === "scan"
            ? "Arahkan kamera ke QR code Google Form"
            : "Tempelkan link Google Form di bawah"}
        </p>
      </div>

      <div className="flex rounded-xl bg-secondary p-1 mb-4 w-full max-w-xs">
        <button
          onClick={() => setMode("scan")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "scan" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Camera className="w-4 h-4" />
          Scan QR
        </button>
        <button
          onClick={() => setMode("paste")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "paste" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Link className="w-4 h-4" />
          Paste Link
        </button>
      </div>

      {blockedUrls.length > 0 && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 mb-4 w-full max-w-xs">
          <p className="text-destructive text-xs font-medium mb-1">Link yang diblokir:</p>
          {blockedUrls.map((url) => (
            <p key={url} className="text-destructive/80 text-xs font-mono break-all">
              {url}
            </p>
          ))}
        </div>
      )}

      {mode === "scan" ? (
        <>
          <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden bg-secondary border-2 border-border">
            <div id={containerRef.current} className="w-full h-full" />
            {isStarting && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                <div className="text-center">
                  <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Memulai kamera...</p>
                </div>
              </div>
            )}
            {!isStarting && !error && (
              <>
                <div className="absolute inset-0 scanner-overlay pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/60 scan-line" />
                </div>
              </>
            )}
          </div>
          {error && (
            <div className="mt-4 text-center">
              <p className="text-destructive text-sm mb-3">{error}</p>
              <button
                onClick={() => { scannerRef.current?.stop().catch(() => {}); startScanner(); }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="w-full max-w-xs space-y-3">
          <div className="relative">
            <input
              type="url"
              value={linkInput}
              onChange={(e) => { setLinkInput(e.target.value); setLinkError(null); }}
              placeholder="https://docs.google.com/forms/..."
              className="w-full rounded-xl bg-secondary border-2 border-border px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handlePasteFromClipboard}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors"
              title="Paste dari clipboard"
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>
          </div>
          {linkError && <p className="text-destructive text-xs">{linkError}</p>}
          <button
            onClick={handlePasteSubmit}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Buka Formulir
          </button>
        </div>
      )}

      <p className="text-muted-foreground text-xs text-center mt-6 max-w-xs">
        Hanya link Google Forms yang akan diterima
      </p>
    </div>
  );
};

export default QRScanner;
