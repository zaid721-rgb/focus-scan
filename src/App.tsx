import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabaseConfigError } from "@/integrations/supabase/client";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {supabaseConfigError ? (
        <div className="min-h-screen flex items-center justify-center px-4 bg-background">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold text-foreground mb-3">Konfigurasi deploy belum lengkap</h1>
            <p className="text-sm text-muted-foreground mb-2">
              Aplikasi tidak bisa terhubung ke Supabase karena environment variable belum tersedia saat build GitHub Pages.
            </p>
            <p className="text-xs text-muted-foreground">
              Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di GitHub Secrets/Variables, lalu deploy ulang.
            </p>
          </div>
        </div>
      ) : (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      )}
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
