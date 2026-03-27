import { useState } from "react";
import { Mail, ArrowRight, User } from "lucide-react";

interface EmailLoginProps {
  onLogin: (email: string, name: string) => void;
}

const EmailLogin = ({ onLogin }: EmailLoginProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setError("Masukkan nama lengkap Anda");
      return;
    }
    if (!trimmedEmail) {
      setError("Masukkan email Anda");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("Format email tidak valid");
      return;
    }
    setError(null);
    onLogin(trimmedEmail, trimmedName);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Masuk</h1>
          <p className="text-muted-foreground text-sm">
            Masukkan nama dan email Anda untuk mulai mengakses formulir
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="Nama lengkap"
              className="w-full rounded-xl bg-secondary border-2 border-border pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="nama@email.com"
              className="w-full rounded-xl bg-secondary border-2 border-border pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Masuk
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-muted-foreground text-xs text-center mt-6">
          Data digunakan untuk melacak akses formulir Anda
        </p>
      </div>
    </div>
  );
};

export default EmailLogin;
