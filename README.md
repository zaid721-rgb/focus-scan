# Focus Scan

Aplikasi monitoring ujian berbasis `React + Vite + Supabase`.

## ✅ Perubahan yang sudah diterapkan

- Siswa sekarang bisa **mengetik nama dan mata pelajaran**.
- Saat siswa mengetik, muncul **rekomendasi otomatis** dari data yang diinput admin di Supabase.
- Jika nama atau mata pelajaran tidak sesuai data admin, akan muncul **notifikasi** dan akses ujian **ditolak**.
- Kredensial admin **tidak ditampilkan langsung** di daftar rekomendasi siswa.
- Query login dioptimalkan dengan index database untuk pencarian nama dan pelajaran.

## 🔐 Konfigurasi Supabase yang aman

1. Salin file `.env.example` menjadi `.env`.
2. Isi hanya:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. **Jangan pernah** menaruh `service_role key` di frontend.
4. File `.env` sudah ditambahkan ke `.gitignore` agar tidak ikut ter-commit.

> Jika `.env` sempat ter-publish ke repository, sebaiknya lakukan **rotate key** dari dashboard Supabase.
