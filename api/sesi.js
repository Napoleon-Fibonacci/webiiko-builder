"use strict";

const { pembungkus, kirim } = require("./_lib/http");
const { config } = require("./_lib/env");
const { pengguna } = require("./_lib/sesi");
const { select } = require("./_lib/db");

module.exports = pembungkus(async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return kirim(res, 405, { galat: "Metode tidak diizinkan." });
  }
  const user = await pengguna(req);
  if (!user) return kirim(res, 200, { masuk: false });

  const hari = new Date().toISOString().slice(0, 10);
  const baris = await select(
    "usage_daily",
    `user_id=eq.${user.id}&day=eq.${hari}&select=builds&limit=1`,
  );
  const terpakai = Array.isArray(baris) && baris[0] ? Number(baris[0].builds || 0) : 0;

  kirim(res, 200, {
    masuk: true,
    nama: user.name || "Pengguna",
    kuota: { terpakai, batas: config.maxBuildsPerDay },
  });
});
