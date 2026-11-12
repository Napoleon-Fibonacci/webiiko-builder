"use strict";

const { pembungkus, kirim } = require("./_lib/http");
const { config } = require("./_lib/env");
const { pengguna } = require("./_lib/sesi");
const { select } = require("./_lib/db");
const { normalisasi, BERKAS } = require("./_lib/validate");
const { buatZip } = require("./_lib/zip");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function namaAman(teks) {
  return String(teks || "website")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "website";
}

module.exports = pembungkus(async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return kirim(res, 405, { galat: "Metode tidak diizinkan." });
  }

  const user = await pengguna(req);
  if (!user) return kirim(res, 401, { galat: "Silakan masuk dulu." });

  const url = new URL(req.url, config.appUrl);
  const id = url.searchParams.get("id");
  if (!id || !UUID.test(id)) return kirim(res, 400, { galat: "ID project tidak valid." });

  const baris = await select(
    "projects",
    `id=eq.${id}&user_id=eq.${user.id}&select=name,files&limit=1`,
  );
  const project = Array.isArray(baris) ? baris[0] : null;
  if (!project) return kirim(res, 404, { galat: "Project tidak ditemukan." });

  const files = normalisasi(project.files);
  const zip = buatZip(BERKAS.map((nama) => ({ nama, isi: files[nama] })));

  res.statusCode = 200;
  res.setHeader("content-type", "application/zip");
  res.setHeader("content-length", String(zip.length));
  res.setHeader("cache-control", "no-store");
  res.setHeader(
    "content-disposition",
    `attachment; filename="${namaAman(project.name)}.zip"`,
  );
  res.end(zip);
});
