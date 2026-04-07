import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

serve(async (req) => {
  const startTime = Date.now();

  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!TELEGRAM_BOT_TOKEN) return errorRes("TELEGRAM_BOT_TOKEN not configured");

  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!TELEGRAM_CHAT_ID) return errorRes("TELEGRAM_CHAT_ID not configured");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read current offset
  const { data: state, error: stateErr } = await supabase
    .from("telegram_bot_state")
    .select("update_offset")
    .eq("id", 1)
    .single();

  if (stateErr) return errorRes(stateErr.message);

  let currentOffset = state.update_offset;
  let totalProcessed = 0;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offset: currentOffset,
          timeout,
          allowed_updates: ["message"],
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) return errorRes(`Telegram API error: ${JSON.stringify(data)}`);

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      if (!update.message?.text) continue;
      const chatId = update.message.chat.id;

      // Only process commands from the configured admin chat
      if (String(chatId) !== TELEGRAM_CHAT_ID) continue;

      const text = update.message.text.trim();
      const reply = await handleCommand(text, supabase, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);

      if (reply) {
        await sendTelegram(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, reply);
      }

      totalProcessed++;
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase
      .from("telegram_bot_state")
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq("id", 1);

    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed }), {
    headers: { "Content-Type": "application/json" },
  });
});

function errorRes(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendTelegram(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function handleCommand(text: string, supabase: any, token: string, chatId: string): Promise<string | null> {
  const lower = text.toLowerCase();

  // /help
  if (lower === "/help" || lower === "/start") {
    return `📋 <b>Daftar Perintah Bot Admin</b>

/reset NamaSiswa — Reset blokir siswa
/resetall — Reset semua blokir
/status — Lihat sesi aktif
/data — Export data sesi (CSV)
/tambah Nama;Mapel;Kelas;URL — Tambah ujian
/lock Nama;Mapel — Kunci ujian
/unlock Nama;Mapel — Buka kunci ujian
/hapus Nama;Mapel — Hapus ujian
/daftar — Lihat semua ujian terdaftar
/help — Tampilkan bantuan ini`;
  }

  // /status
  if (lower === "/status") {
    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("is_active", true)
      .order("started_at", { ascending: false });

    if (!sessions || sessions.length === 0) {
      return "📊 Tidak ada sesi aktif saat ini.";
    }

    let msg = `📊 <b>Sesi Aktif: ${sessions.length}</b>\n\n`;
    for (const s of sessions) {
      const status = s.blocked ? "🚫 Diblokir" : `⚠️ ${s.violation_count} pelanggaran`;
      msg += `👤 ${s.student_name} (${s.class})\n📚 ${s.subject}\n${status}\n\n`;
    }
    return msg;
  }

  // /reset NamaSiswa
  if (lower.startsWith("/reset ") && !lower.startsWith("/resetall")) {
    const name = text.substring(7).trim();
    if (!name) return "❌ Format: /reset NamaSiswa";

    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("*")
      .ilike("student_name", `%${name}%`);

    if (!sessions || sessions.length === 0) {
      return `❌ Tidak ditemukan sesi untuk siswa "${name}"`;
    }

    let resetCount = 0;
    for (const s of sessions) {
      if (s.blocked || s.violation_count > 0) {
        await supabase
          .from("exam_sessions")
          .update({ blocked: false, violation_count: 0, is_active: true })
          .eq("id", s.id);
        resetCount++;
      }
    }

    return `✅ Reset berhasil untuk "${name}"\n📊 ${resetCount} sesi direset dari ${sessions.length} sesi ditemukan.`;
  }

  // /resetall
  if (lower === "/resetall") {
    const { data: blocked } = await supabase
      .from("exam_sessions")
      .select("id")
      .or("blocked.eq.true,violation_count.gt.0");

    if (!blocked || blocked.length === 0) {
      return "✅ Tidak ada sesi yang perlu direset.";
    }

    for (const s of blocked) {
      await supabase
        .from("exam_sessions")
        .update({ blocked: false, violation_count: 0, is_active: true })
        .eq("id", s.id);
    }

    return `✅ Reset semua berhasil!\n📊 ${blocked.length} sesi telah direset.`;
  }

  // /data — export CSV
  if (lower === "/data") {
    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("*")
      .order("started_at", { ascending: false });

    if (!sessions || sessions.length === 0) {
      return "📊 Tidak ada data sesi.";
    }

    let csv = "Nama,Kelas,Mapel,Pelanggaran,Diblokir,Aktif,Mulai\n";
    for (const s of sessions) {
      const started = new Date(s.started_at).toLocaleString("id-ID");
      csv += `"${s.student_name}","${s.class}","${s.subject}",${s.violation_count},${s.blocked ? "Ya" : "Tidak"},${s.is_active ? "Ya" : "Tidak"},"${started}"\n`;
    }

    // Send CSV as document
    const blob = new Blob([csv], { type: "text/csv" });
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("document", blob, `data_sesi_${new Date().toISOString().slice(0, 10)}.csv`);
    formData.append("caption", `📊 Data sesi ujian (${sessions.length} baris)`);

    await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: "POST",
      body: formData,
    });

    return null; // already sent as document
  }

  // /tambah Nama;Mapel;Kelas;URL
  if (lower.startsWith("/tambah ")) {
    const parts = text.substring(8).split(";").map((p: string) => p.trim());
    if (parts.length < 4) {
      return "❌ Format: /tambah Nama;Mapel;Kelas;URL\nContoh: /tambah Ahmad;Matematika;10A;https://forms.google.com/...";
    }

    const [student_name, subject, studentClass, exam_url] = parts;

    const { error } = await supabase.from("exams").insert({
      student_name,
      subject,
      class: studentClass,
      exam_url,
    });

    if (error) return `❌ Gagal menambahkan: ${error.message}`;
    return `✅ Ujian ditambahkan!\n👤 ${student_name}\n📚 ${subject}\n🏫 ${studentClass}`;
  }

  // /lock Nama;Mapel
  if (lower.startsWith("/lock ")) {
    const parts = text.substring(6).split(";").map((p: string) => p.trim());
    if (parts.length < 2) {
      return "❌ Format: /lock Nama;Mapel";
    }

    const [name, subject] = parts;
    const { data: exams } = await supabase
      .from("exams")
      .select("*")
      .ilike("student_name", `%${name}%`)
      .ilike("subject", `%${subject}%`);

    if (!exams || exams.length === 0) {
      return `❌ Ujian tidak ditemukan untuk "${name}" - "${subject}"`;
    }

    let locked = 0;
    for (const e of exams) {
      await supabase.from("exams").update({ locked: true }).eq("id", e.id);
      locked++;
    }

    return `🔒 ${locked} ujian dikunci untuk "${name}" - "${subject}"`;
  }

  // /unlock Nama;Mapel
  if (lower.startsWith("/unlock ")) {
    const parts = text.substring(8).split(";").map((p: string) => p.trim());
    if (parts.length < 2) {
      return "❌ Format: /unlock Nama;Mapel";
    }

    const [name, subject] = parts;
    const { data: exams } = await supabase
      .from("exams")
      .select("*")
      .ilike("student_name", `%${name}%`)
      .ilike("subject", `%${subject}%`);

    if (!exams || exams.length === 0) {
      return `❌ Ujian tidak ditemukan untuk "${name}" - "${subject}"`;
    }

    let unlocked = 0;
    for (const e of exams) {
      await supabase.from("exams").update({ locked: false }).eq("id", e.id);
      unlocked++;
    }

    return `🔓 ${unlocked} ujian dibuka untuk "${name}" - "${subject}"`;
  }

  // /hapus Nama;Mapel
  if (lower.startsWith("/hapus ")) {
    const parts = text.substring(7).split(";").map((p: string) => p.trim());
    if (parts.length < 2) {
      return "❌ Format: /hapus Nama;Mapel";
    }

    const [name, subject] = parts;
    const { data: exams } = await supabase
      .from("exams")
      .select("*")
      .ilike("student_name", `%${name}%`)
      .ilike("subject", `%${subject}%`);

    if (!exams || exams.length === 0) {
      return `❌ Ujian tidak ditemukan untuk "${name}" - "${subject}"`;
    }

    for (const e of exams) {
      await supabase.from("exams").delete().eq("id", e.id);
    }

    return `🗑️ ${exams.length} ujian dihapus untuk "${name}" - "${subject}"`;
  }

  // /daftar — list all exams
  if (lower === "/daftar") {
    const { data: exams } = await supabase
      .from("exams")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!exams || exams.length === 0) {
      return "📋 Belum ada ujian terdaftar.";
    }

    let msg = `📋 <b>Daftar Ujian (${exams.length})</b>\n\n`;
    for (const e of exams) {
      const lockIcon = e.locked ? "🔒" : "🔓";
      msg += `${lockIcon} ${e.student_name} (${e.class})\n📚 ${e.subject}\n\n`;
    }
    return msg;
  }

  // Unknown command
  if (text.startsWith("/")) {
    return `❓ Perintah tidak dikenali: ${text}\nKetik /help untuk melihat daftar perintah.`;
  }

  return null;
}
