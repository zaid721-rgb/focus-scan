import { useState } from "react";
import { Mail, ArrowRight } from "lucide-react";

interface EmailLoginProps {
  onLogin: (email: string) => void;
}

const EmailLogin = ({ onLogin }: EmailLoginProps) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Masukkan email Anda");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError("Format email tidak valid");
      return;
    }
    setError(null);
    onLogin(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Masuk dengan Email</h1>
          <p className="text-muted-foreground text-sm">
            Masukkan email Anda untuk mulai mengakses formulir
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="nama@email.com"
              className="w-full rounded-xl bg-secondary border-2 border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
            {error && <p className="text-destructive text-xs mt-2">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Masuk
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-muted-foreground text-xs text-center mt-6">
          Email digunakan untuk melacak akses formulir Anda
        </p>
      </div>
    </div>
  );
};

export default EmailLogin;
