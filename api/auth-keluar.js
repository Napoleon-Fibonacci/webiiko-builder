"use strict";

const { pembungkus, kirim } = require("./_lib/http");
const { hapusSesi } = require("./_lib/sesi");

module.exports = pembungkus(async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return kirim(res, 405, { galat: "Metode tidak diizinkan." });
  }
  hapusSesi(res);
  kirim(res, 200, { ok: true });
});
