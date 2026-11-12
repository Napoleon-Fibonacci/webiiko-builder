"use strict";

const { config } = require("./env");

class Kesalahan extends Error {
  constructor(status, pesan) {
    super(pesan);
    this.status = status;
    this.pesan = pesan;
  }
}

function headers(extra = {}) {
  return {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function request(path, { method = "GET", body, prefer } = {}) {
  const url = `${config.supabaseUrl}/rest/v1/${path}`;
  const h = headers(prefer ? { Prefer: prefer } : {});
  const res = await fetch(url, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const teks = await res.text();
  if (!res.ok) {
    console.error(`[db] ${method} ${path} -> ${res.status}: ${teks.slice(0, 400)}`);
    throw new Kesalahan(500, "Database sedang tidak bisa dihubungi.");
  }
  if (!teks) return null;
  try {
    return JSON.parse(teks);
  } catch {
    return null;
  }
}

function select(tabel, query = "") {
  return request(`${tabel}${query ? `?${query}` : ""}`);
}

function insert(tabel, baris, { onConflict } = {}) {
  const q = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : "";
  return request(`${tabel}${q}`, {
    method: "POST",
    body: baris,
    prefer: "return=representation,resolution=merge-duplicates",
  });
}

function update(tabel, query, patch) {
  return request(`${tabel}?${query}`, {
    method: "PATCH",
    body: patch,
    prefer: "return=representation",
  });
}

function remove(tabel, query) {
  return request(`${tabel}?${query}`, {
    method: "DELETE",
    prefer: "return=representation",
  });
}

function rpc(fungsi, args) {
  return request(`rpc/${fungsi}`, { method: "POST", body: args });
}

module.exports = { Kesalahan, select, insert, update, remove, rpc };
