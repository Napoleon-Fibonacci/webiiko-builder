"use strict";

const { config } = require("./env");
const { Kesalahan } = require("./db");

let posisi = 0;
let modelCache = null;
const istirahat = new Map();
const ISTIRAHAT_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 45000;

function keyAktif() {
  const semua = config.gonkaKeys;
  if (!semua.length) throw new Kesalahan(500, "GONKA_KEYS belum diisi.");
  const sekarang = Date.now();
  const siap = semua.map((_, i) => i).filter((i) => (istirahat.get(i) || 0) <= sekarang);
  return { semua, urut: siap.length ? siap : semua.map((_, i) => i) };
}

async function modelUntuk(key) {
  if (config.gonkaModel) return config.gonkaModel;
  if (modelCache) return modelCache;
  const res = await fetch(`${config.gonkaBase}/models`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  const teks = await res.text();
  if (!res.ok) throw new Error(`models ${res.status}: ${teks.slice(0, 200)}`);
  const data = JSON.parse(teks);
  const daftar = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  const id = daftar[0]?.id;
  if (!id) throw new Error("Daftar model kosong.");
  modelCache = id;
  return id;
}

async function panggilSatu(key, model, body) {
  const res = await fetch(`${config.gonkaBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ ...body, model }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const teks = await res.text();
  if (!res.ok) {
    const e = new Error(`gonka ${res.status}: ${teks.slice(0, 300)}`);
    e.status = res.status;
    throw e;
  }
  try {
    return JSON.parse(teks);
  } catch {
    throw new Error("Balasan AI bukan JSON.");
  }
}

async function panggilChat({ messages, tools, maxTokens = 8000 }) {
  const { semua, urut } = keyAktif();
  let terakhir = null;

  for (const i of urut) {
    const key = semua[i];
    if (!key) continue;
    try {
      const model = await modelUntuk(key);
      const body = {
        messages,
        temperature: 0.3,
        max_tokens: maxTokens,
        stream: false,
      };
      if (tools?.length) {
        body.tools = tools;
        body.tool_choice = "auto";
      }
      const data = await panggilSatu(key, model, body);
      posisi = i;
      istirahat.delete(i);
      return { data, model };
    } catch (e) {
      terakhir = e;
      const status = e.status || 0;
      const sementara =
        !status ||
        status === 401 ||
        status === 402 ||
        status === 403 ||
        status === 408 ||
        status === 409 ||
        status === 429 ||
        status >= 500;
      console.error(`[gonka] key ke-${i + 1} gagal: ${e.message}`);
      if (!sementara) {
        if (status >= 400 && status < 500) {
          throw new Kesalahan(502, "Model AI menolak permintaan. Coba lagi sebentar.");
        }
        throw new Kesalahan(502, "Layanan AI sedang bermasalah.");
      }
      istirahat.set(i, Date.now() + ISTIRAHAT_MS);
    }
  }

  console.error("[gonka] semua key gagal:", terakhir?.message);
  throw new Kesalahan(502, "Semua kunci AI sedang tidak bisa dipakai. Coba lagi nanti.");
}

module.exports = { panggilChat };
