"use strict";

const { Kesalahan } = require("./db");

function kirim(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

function galat(res, status, pesan) {
  kirim(res, status, { galat: pesan });
}

async function bacaJson(req, maks = 32768) {
  if (req.body && typeof req.body === "object") return req.body;
  const potongan = [];
  let total = 0;
  for await (const bagian of req) {
    total += bagian.length;
    if (total > maks) throw new Kesalahan(413, "Permintaan terlalu besar.");
    potongan.push(bagian);
  }
  if (!total) return {};
  try {
    return JSON.parse(Buffer.concat(potongan).toString("utf8"));
  } catch {
    throw new Kesalahan(400, "Isi permintaan bukan JSON yang valid.");
  }
}

function hanya(req, res, method) {
  if (req.method !== method) {
    res.setHeader("allow", method);
    throw new Kesalahan(405, "Metode tidak diizinkan.");
  }
}

function pembungkus(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error("[api]", e);
      if (res.headersSent) return;
      const status = e.status || 500;
      const pesan =
        status >= 500 ? "Terjadi kesalahan di server." : e.pesan || "Permintaan ditolak.";
      galat(res, status, pesan);
    }
  };
}

module.exports = { kirim, galat, bacaJson, hanya, pembungkus };
