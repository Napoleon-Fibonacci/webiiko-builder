"use strict";

const { pembungkus, kirim, bacaJson, hanya } = require("./_lib/http");
const { config } = require("./_lib/env");
const { pengguna, asalSama } = require("./_lib/sesi");
const { batasi } = require("./_lib/rate");
const { Kesalahan, select, insert, update, rpc } = require("./_lib/db");
const { jalankanLangkah } = require("./_lib/build");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TERKUNCI_MS = 120000;

module.exports = pembungkus(async (req, res) => {
  hanya(req, res, "POST");
  if (!asalSama(req)) return kirim(res, 403, { galat: "Asal permintaan tidak dikenal." });
  if (config.builderOff) return kirim(res, 503, { galat: "Builder sedang dimatikan." });

  const user = await pengguna(req);
  if (!user) return kirim(res, 401, { galat: "Silakan masuk dulu." });

  const lolos = await batasi("build", user.id, 3600, 10);
  if (!lolos) return kirim(res, 429, { galat: "Terlalu sering memulai Build. Tunggu sebentar." });

  const body = await bacaJson(req);
  const projectId = String(body?.project_id || "");
  const prompt = String(body?.prompt || "").trim();

  if (!UUID.test(projectId)) throw new Kesalahan(400, "ID project tidak valid.");
  if (!prompt) throw new Kesalahan(400, "Tulis dulu mau bikin apa.");
  if (prompt.length > config.maxPromptChars) {
    throw new Kesalahan(400, `Prompt maksimal ${config.maxPromptChars} karakter.`);
  }

  const baris = await select(
    "projects",
    `id=eq.${projectId}&user_id=eq.${user.id}&select=*&limit=1`,
  );
  const project = Array.isArray(baris) ? baris[0] : null;
  if (!project) throw new Kesalahan(404, "Project tidak ditemukan.");

  const terkunci =
    project.status === "jalan" &&
    project.locked_at &&
    Date.now() - new Date(project.locked_at).getTime() < TERKUNCI_MS;
  if (terkunci) throw new Kesalahan(409, "Build sebelumnya masih berjalan.");

  const boleh = await rpc("mulai_build", {
    p_user: user.id,
    p_limit: config.maxBuildsPerDay,
  });
  if (boleh !== true) {
    return kirim(res, 429, {
      galat: `Kuota harian habis (${config.maxBuildsPerDay} Build). Coba lagi besok.`,
    });
  }

  await insert("messages", { project_id: project.id, data: { role: "user", content: prompt } });

  const namaBaru =
    project.name === "Project baru" ? prompt.replace(/\s+/g, " ").slice(0, 40) : project.name;

  await update("projects", `id=eq.${project.id}`, {
    name: namaBaru,
    status: "jalan",
    step: 0,
    tokens: 0,
    error: null,
    locked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  try {
    const hasil = await jalankanLangkah(project.id, user);
    kirim(res, 200, hasil);
  } catch (e) {
    await update("projects", `id=eq.${project.id}`, {
      status: "gagal",
      error: "Build gagal dimulai. Coba lagi.",
      locked_at: null,
      updated_at: new Date().toISOString(),
    });
    throw e;
  }
});
