"use strict";

const { config } = require("./env");
const { Kesalahan, select, insert, update, rpc } = require("./db");
const { panggilChat } = require("./gonka");
const { bacaSkills } = require("./skills");
const { BERKAS, normalisasi, validasi } = require("./validate");

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "Daftar berkas yang ada beserta ukurannya.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Baca isi satu berkas.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", enum: BERKAS } },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Tulis ulang isi satu berkas. Isi lama diganti seluruhnya.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", enum: BERKAS },
          content: { type: "string" },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "validate_site",
      description: "Periksa tiga berkas: ukuran, struktur HTML, dan aset eksternal.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

function pesanSistem(files) {
  const total = BERKAS.reduce((n, b) => n + files[b].length, 0);
  const daftar = BERKAS.map(
    (b) => `- ${b}: ${Buffer.byteLength(files[b], "utf8")} byte`,
  ).join("\n");
  const isi =
    total <= 40000
      ? `\n\nIsi berkas saat ini:\n${BERKAS.map((b) => `### ${b}\n\`\`\`\n${files[b]}\n\`\`\``).join("\n")}`
      : "\n\nBerkas terlalu besar untuk ditempel. Pakai read_file bila perlu.";
  return `${bacaSkills()}

## Berkas project
${daftar}${isi}`;
}

function ambilJson(teks) {
  if (!teks) return null;
  const pagar = teks.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const calon = pagar ? pagar[1] : teks;
  const awal = calon.indexOf("{");
  const akhir = calon.lastIndexOf("}");
  if (awal < 0 || akhir <= awal) return null;
  try {
    return JSON.parse(calon.slice(awal, akhir + 1));
  } catch {
    return null;
  }
}

function perkiraanToken(teks) {
  return Math.ceil((teks || "").length / 4);
}

async function muatPesan(projectId) {
  const baris = await select(
    "messages",
    `project_id=eq.${projectId}&select=data&order=id.desc&limit=40`,
  );
  return (Array.isArray(baris) ? baris : []).reverse();
}

async function jalankanAlat(nama, args, files) {
  if (nama === "list_files") {
    return BERKAS.map((b) => ({ path: b, bytes: Buffer.byteLength(files[b], "utf8") }));
  }
  if (nama === "read_file") {
    if (!BERKAS.includes(args.path)) return { galat: "Path tidak dikenal." };
    return { path: args.path, content: files[args.path] };
  }
  if (nama === "write_file") {
    if (!BERKAS.includes(args.path)) return { galat: "Path tidak dikenal." };
    if (typeof args.content !== "string") return { galat: "content harus string." };
    const ukuran = Buffer.byteLength(args.content, "utf8");
    if (ukuran > config.maxFileBytes) {
      return { galat: `Berkas terlalu besar (${ukuran} byte).` };
    }
    files[args.path] = args.content;
    return { ok: true, path: args.path, bytes: ukuran };
  }
  if (nama === "validate_site") {
    const hasil = validasi(files, config.maxFileBytes);
    return { ok: hasil.ok, errors: hasil.errors };
  }
  return { galat: "Alat tidak dikenal." };
}

function ringkas(project) {
  return {
    id: project.id,
    nama: project.name,
    status: project.status,
    step: project.step,
    tokens: Number(project.tokens || 0),
    error: project.error || null,
    files: normalisasi(project.files),
  };
}

async function jalankanLangkah(projectId, user) {
  const baris = await select(
    "projects",
    `id=eq.${projectId}&user_id=eq.${user.id}&select=*&limit=1`,
  );
  const project = Array.isArray(baris) ? baris[0] : null;
  if (!project) throw new Kesalahan(404, "Project tidak ditemukan.");
  if (project.status !== "jalan") return ringkas(project);

  const sisa = config.maxTokensPerBuild - Number(project.tokens || 0);
  if (sisa <= 1000) {
    const v = validasi(project.files, config.maxFileBytes);
    const selesai = await update("projects", `id=eq.${project.id}`, {
      status: v.ok ? "selesai" : "gagal",
      error: v.ok ? null : `Anggaran token habis. ${v.errors.join("; ")}`,
      locked_at: null,
      updated_at: new Date().toISOString(),
    });
    return ringkas(selesai[0]);
  }

  const riwayat = await muatPesan(project.id);
  const files = normalisasi(project.files);
  const pesan = [
    { role: "system", content: pesanSistem(files) },
    ...riwayat.map((r) => r.data),
  ];

  let balasan;
  let tanpaAlat = false;
  try {
    balasan = await panggilChat({
      messages: pesan,
      tools: TOOLS,
      maxTokens: Math.min(8000, sisa),
    });
  } catch (e) {
    if (e.pesan && e.pesan.includes("menolak")) {
      tanpaAlat = true;
      balasan = await panggilChat({
        messages: [
          ...pesan,
          {
            role: "user",
            content:
              'Balas HANYA dengan satu blok ```json berisi {"files":{"index.html":"...","style.css":"...","script.js":"..."}} tanpa penjelasan.',
          },
        ],
        maxTokens: Math.min(8000, sisa),
      });
    } else {
      throw e;
    }
  }

  const pilihan = balasan.data?.choices?.[0]?.message;
  if (!pilihan) throw new Kesalahan(502, "AI tidak mengembalikan jawaban.");

  const alat = Array.isArray(pilihan.tool_calls) ? pilihan.tool_calls : [];
  const asisten = { role: "assistant", content: pilihan.content || "" };
  if (alat.length) asisten.tool_calls = alat;

  const pesanBaru = [{ project_id: project.id, data: asisten }];
  const hasilAlat = [];

  for (const panggilan of alat) {
    let args = {};
    try {
      args = JSON.parse(panggilan.function?.arguments || "{}");
    } catch {
      args = {};
    }
    const hasil = await jalankanAlat(panggilan.function?.name, args, files);
    hasilAlat.push({
      role: "tool",
      tool_call_id: panggilan.id,
      content: JSON.stringify(hasil).slice(0, 20000),
    });
  }

  for (const h of hasilAlat) pesanBaru.push({ project_id: project.id, data: h });

  if (tanpaAlat || !alat.length) {
    const json = ambilJson(pilihan.content);
    if (json?.files && typeof json.files === "object") {
      const baru = normalisasi(json.files);
      for (const b of BERKAS) files[b] = baru[b];
    }
  }

  const pakai = Number(balasan.data?.usage?.total_tokens) || perkiraanToken(JSON.stringify(balasan.data));
  const totalToken = Number(project.tokens || 0) + pakai;
  const langkah = Number(project.step || 0) + 1;
  const berhenti =
    !alat.length || langkah >= config.maxSteps || totalToken >= config.maxTokensPerBuild;

  let status = "jalan";
  let error = null;

  if (berhenti) {
    const v = validasi(files, config.maxFileBytes);
    if (v.ok) {
      status = "selesai";
      for (const b of BERKAS) files[b] = v.files[b];
    } else {
      status = "gagal";
      error = v.errors.join("; ");
    }
  }

  const [diperbarui] = await update("projects", `id=eq.${project.id}`, {
    files,
    status,
    step: langkah,
    tokens: totalToken,
    error,
    locked_at: status === "jalan" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });

  await insert("messages", pesanBaru);

  await rpc("catat_token", {
    p_user: user.id,
    p_tokens: pakai,
    p_limit: config.maxTokensPerDay,
  });

  return {
    ...ringkas(diperbarui),
    pesan: pilihan.content || "",
    selesai: status !== "jalan",
  };
}

module.exports = { jalankanLangkah, ringkas, muatPesan };
