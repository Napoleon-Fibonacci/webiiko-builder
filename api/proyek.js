"use strict";

const { pembungkus, kirim, bacaJson } = require("./_lib/http");
const { config } = require("./_lib/env");
const { pengguna, asalSama } = require("./_lib/sesi");
const { Kesalahan, select, insert, remove } = require("./_lib/db");
const { AWAL } = require("./_lib/validate");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idDari(req) {
  const url = new URL(req.url, config.appUrl);
  const id = url.searchParams.get("id");
  if (!id || !UUID.test(id)) throw new Kesalahan(400, "ID project tidak valid.");
  return id;
}

function rapikanPesan(baris) {
  const hasil = [];
  for (const r of baris) {
    const d = r.data || {};
    if (d.role === "user" && typeof d.content === "string") {
      hasil.push({ peran: "user", teks: d.content.slice(0, config.maxPromptChars) });
    } else if (d.role === "assistant" && typeof d.content === "string" && d.content.trim()) {
      const teks = d.content.trim();
      if (teks.startsWith("{") || teks.startsWith("```")) continue;
      hasil.push({ peran: "ai", teks: teks.slice(0, 4000) });
    }
  }
  return hasil.slice(-40);
}

module.exports = pembungkus(async (req, res) => {
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("allow", "GET, POST, DELETE");
    return kirim(res, 405, { galat: "Metode tidak diizinkan." });
  }

  const user = await pengguna(req);
  if (!user) return kirim(res, 401, { galat: "Silakan masuk dulu." });

  if (req.method !== "GET" && !asalSama(req)) {
    return kirim(res, 403, { galat: "Asal permintaan tidak dikenal." });
  }

  const url = new URL(req.url, config.appUrl);

  if (req.method === "GET") {
    const id = url.searchParams.get("id");
    if (id) {
      if (!UUID.test(id)) return kirim(res, 400, { galat: "ID project tidak valid." });
      const baris = await select(
        "projects",
        `id=eq.${id}&user_id=eq.${user.id}&select=*&limit=1`,
      );
      const project = Array.isArray(baris) ? baris[0] : null;
      if (!project) return kirim(res, 404, { galat: "Project tidak ditemukan." });
      const pesan = await select(
        "messages",
        `project_id=eq.${id}&select=data&order=id.desc&limit=40`,
      );
      return kirim(res, 200, {
        project: {
          id: project.id,
          nama: project.name,
          status: project.status,
          step: project.step,
          tokens: Number(project.tokens || 0),
          error: project.error || null,
          files: project.files || {},
          diperbarui: project.updated_at,
        },
        pesan: rapikanPesan((Array.isArray(pesan) ? pesan : []).reverse()),
      });
    }

    const daftar = await select(
      "projects",
      `user_id=eq.${user.id}&select=id,name,status,step,tokens,updated_at&order=updated_at.desc`,
    );
    return kirim(res, 200, { projects: Array.isArray(daftar) ? daftar : [] });
  }

  if (req.method === "POST") {
    const body = await bacaJson(req);
    const jumlah = await select("projects", `user_id=eq.${user.id}&select=id`);
    if ((Array.isArray(jumlah) ? jumlah.length : 0) >= config.maxProjects) {
      return kirim(res, 409, {
        galat: `Maksimal ${config.maxProjects} project. Hapus satu dulu.`,
      });
    }
    const nama = String(body?.nama || "Project baru").trim().slice(0, 40) || "Project baru";
    const baris = await insert("projects", {
      user_id: user.id,
      name: nama,
      files: AWAL,
      status: "idle",
    });
    const project = Array.isArray(baris) ? baris[0] : null;
    if (!project) throw new Kesalahan(500, "Project gagal dibuat.");
    return kirim(res, 201, {
      project: {
        id: project.id,
        nama: project.name,
        status: project.status,
        step: project.step,
        tokens: Number(project.tokens || 0),
      },
    });
  }

  const id = idDari(req);
  const baris = await remove("projects", `id=eq.${id}&user_id=eq.${user.id}`);
  if (!Array.isArray(baris) || !baris.length) {
    return kirim(res, 404, { galat: "Project tidak ditemukan." });
  }
  kirim(res, 200, { ok: true });
});
