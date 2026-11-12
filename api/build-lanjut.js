"use strict";

const { pembungkus, kirim, bacaJson, hanya } = require("./_lib/http");
const { config } = require("./_lib/env");
const { pengguna, asalSama } = require("./_lib/sesi");
const { batasi } = require("./_lib/rate");
const { Kesalahan, select, update } = require("./_lib/db");
const { jalankanLangkah, ringkas } = require("./_lib/build");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = pembungkus(async (req, res) => {
  hanya(req, res, "POST");
  if (!asalSama(req)) return kirim(res, 403, { galat: "Asal permintaan tidak dikenal." });
  if (config.builderOff) return kirim(res, 503, { galat: "Builder sedang dimatikan." });

  const user = await pengguna(req);
  if (!user) return kirim(res, 401, { galat: "Silakan masuk dulu." });

  const lolos = await batasi("langkah", user.id, 60, 60);
  if (!lolos) return kirim(res, 429, { galat: "Terlalu cepat. Tunggu sebentar." });

  const body = await bacaJson(req);
  const projectId = String(body?.project_id || "");
  if (!UUID.test(projectId)) throw new Kesalahan(400, "ID project tidak valid.");

  const baris = await select(
    "projects",
    `id=eq.${projectId}&user_id=eq.${user.id}&select=*&limit=1`,
  );
  const project = Array.isArray(baris) ? baris[0] : null;
  if (!project) throw new Kesalahan(404, "Project tidak ditemukan.");
  if (project.status !== "jalan") return kirim(res, 200, ringkas(project));

  try {
    const hasil = await jalankanLangkah(project.id, user);
    kirim(res, 200, hasil);
  } catch (e) {
    await update("projects", `id=eq.${project.id}`, {
      error: "Langkah gagal. Tekan coba lagi.",
      locked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    throw e;
  }
});
