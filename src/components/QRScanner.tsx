import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ScanLine, Camera, AlertTriangle } from "lucide-react";

interface QRScannerProps {
  onScan: (url: string) => void;
  scanCount: number;
}

const QRScanner = ({ onScan, scanCount }: QRScannerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>("qr-reader-" + Date.now());

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
          if (decodedText.includes("docs.google.com/forms") || decodedText.includes("forms.gle")) {
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
  }, [onScan]);

  useEffect(() => {
    startScanner();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, [startScanner]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 mb-4">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-secondary-foreground">Secure Form Scanner</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Scan QR Code</h1>
        <p className="text-muted-foreground text-sm">
          Arahkan kamera ke QR code Google Form
        </p>
      </div>

      {/* Scan count warning */}
      {scanCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/30 px-4 py-2 mb-4 w-full max-w-xs">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span className="text-warning text-xs font-medium">
            Peringatan: Scan ulang ke-{scanCount}/3. Setelah 3x, jawaban otomatis tersubmit.
          </span>
        </div>
      )}

      {/* Scanner area */}
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

      <p className="text-muted-foreground text-xs text-center mt-6 max-w-xs">
        Hanya QR code yang berisi link Google Forms yang akan diterima
      </p>
    </div>
  );
};

export default QRScanner;
