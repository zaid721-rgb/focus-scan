

## Rencana Perbaikan

### Masalah yang Ditemukan

| # | Masalah | File | Prioritas |
|---|---------|------|-----------|
| 1 | Database missing 7 kolom yang dipakai kode (`class`, `locked`, `unlocks_at` di exams; `class`, `device_id`, `is_active`, `is_locked_at_start` di exam_sessions) | Database | Kritis |
| 2 | `deleteAllExams` tidak ada filter — Supabase menolak delete tanpa WHERE | `db.ts` | Tinggi |
| 3 | Blank page saat buka PDF/Drive di mobile — iframe Google Viewer sering gagal di mobile browser | `FormViewer.tsx` | Tinggi |
| 4 | `types.ts` diedit manual dengan kolom yang belum ada di DB — akan desync | `types.ts` | Sedang |

### Langkah Perbaikan

**Step 1: Database Migration — tambah kolom yang hilang**

```sql
ALTER TABLE public.exams 
  ADD COLUMN IF NOT EXISTS class text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlocks_at timestamptz;

ALTER TABLE public.exam_sessions 
  ADD COLUMN IF NOT EXISTS class text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS device_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_locked_at_start boolean NOT NULL DEFAULT false;
```

Setelah migration, `types.ts` akan otomatis ter-regenerate dan sinkron.

**Step 2: Fix `deleteAllExams` di `db.ts`**

Tambahkan filter dummy agar Supabase mau eksekusi:
```typescript
deleteAllExams: async () => {
  const { error } = await supabase
    .from("exams")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
}
```

**Step 3: Fix blank page PDF/Drive di mobile (`FormViewer.tsx`)**

Masalah: Google Docs Viewer dalam iframe sering blank di mobile (terutama iOS Safari dan beberapa Android browser). Solusi:
- Untuk Google Drive files: gunakan format `/preview` langsung (bukan Google Docs Viewer redirect)
- Tambahkan retry mechanism: jika iframe gagal load dalam 5 detik, otomatis tampilkan tombol "Buka di tab baru"
- Tambahkan `loading` state dengan spinner saat iframe belum selesai load
- Untuk PDF eksternal: tetap gunakan Google Viewer tapi tambahkan auto-fallback ke direct link

Perubahan di `getEmbedUrl()`:
```typescript
// Google Drive file — gunakan /preview langsung (lebih reliable di mobile)
if (rawUrl.includes("drive.google.com/file")) {
  return rawUrl.replace(/\/view.*$/, "/preview");
}
```

Tambahkan `onLoad` handler dan timeout fallback di iframe untuk mendeteksi blank page dan menampilkan tombol buka di tab baru secara otomatis.

### File yang Diubah
1. **Database migration** — tambah 7 kolom
2. **`src/integrations/db.ts`** — fix `deleteAllExams`
3. **`src/components/FormViewer.tsx`** — fix mobile blank page dengan fallback strategy

