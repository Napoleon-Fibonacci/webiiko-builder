"use strict";

const crypto = require("crypto");
const { config } = require("./env");
const { select } = require("./db");

const COOKIE_SESI = "wg_builder_sesi";
const COOKIE_OAUTH = "wg_builder_oauth";
const UMUR_SESI = 7 * 24 * 60 * 60;
const UMUR_OAUTH = 10 * 60;

function tandaTangan(data) {
  return crypto.createHmac("sha256", config.sessionSecret).update(data).digest("base64url");
}

function bikinToken(payload) {
  const isi = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${isi}.${tandaTangan(isi)}`;
}

function bacaToken(token) {
  if (!token || typeof token !== "string") return null;
  const titik = token.lastIndexOf(".");
  if (titik < 1) return null;
  const isi = token.slice(0, titik);
  const sig = token.slice(titik + 1);
  const harap = tandaTangan(isi);
  if (sig.length !== harap.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(harap))) return null;
  try {
    const payload = JSON.parse(Buffer.from(isi, "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const hasil = {};
  const mentah = req.headers.cookie || "";
  for (const bagian of mentah.split(";")) {
    const i = bagian.indexOf("=");
    if (i < 0) continue;
    hasil[bagian.slice(0, i).trim()] = decodeURIComponent(bagian.slice(i + 1).trim());
  }
  return hasil;
}

function cookie(nama, nilai, umur) {
  const bagian = [
    `${nama}=${encodeURIComponent(nilai)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${umur}`,
  ];
  if (config.produksi) bagian.push("Secure");
  return bagian.join("; ");
}

function setSesi(res, userId) {
  const exp = Math.floor(Date.now() / 1000) + UMUR_SESI;
  res.setHeader("Set-Cookie", cookie(COOKIE_SESI, bikinToken({ uid: userId, exp }), UMUR_SESI));
}

function hapusSesi(res) {
  res.setHeader("Set-Cookie", cookie(COOKIE_SESI, "", 0));
}

function setOauth(res, data) {
  const exp = Math.floor(Date.now() / 1000) + UMUR_OAUTH;
  res.setHeader(
    "Set-Cookie",
    cookie(COOKIE_OAUTH, bikinToken({ ...data, exp }), UMUR_OAUTH),
  );
}

function bacaOauth(req) {
  const token = parseCookies(req)[COOKIE_OAUTH];
  if (!token) return null;
  const data = bacaToken(token);
  if (!data || data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

function hapusOauth(res) {
  res.setHeader("Set-Cookie", cookie(COOKIE_OAUTH, "", 0));
}

async function pengguna(req) {
  const token = parseCookies(req)[COOKIE_SESI];
  if (!token) return null;
  const data = bacaToken(token);
  if (!data || !data.uid) return null;
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
  const baris = await select("users", `id=eq.${encodeURIComponent(data.uid)}&select=*&limit=1`);
  const user = Array.isArray(baris) ? baris[0] : null;
  if (!user || user.banned) return null;
  return user;
}

function asalSama(req) {
  const asal = req.headers.origin;
  if (!asal) return true;
  const diizinkan = config.appUrl;
  if (asal === diizinkan) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(asal) && diizinkan.startsWith("http://localhost")) {
    return true;
  }
  return false;
}

function ip(req) {
  const xff = req.headers["x-forwarded-for"];
  const mentah = Array.isArray(xff) ? xff[0] : String(xff || "").split(",")[0];
  return mentah.trim() || req.socket?.remoteAddress || "0.0.0.0";
}

function hashIp(req) {
  return crypto.createHash("sha256").update(`${ip(req)}|${config.sessionSecret}`).digest("hex").slice(0, 24);
}

function acak(n = 32) {
  return crypto.randomBytes(n).toString("base64url");
}

function pkce(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

module.exports = {
  COOKIE_SESI,
  setSesi,
  hapusSesi,
  setOauth,
  bacaOauth,
  hapusOauth,
  pengguna,
  asalSama,
  hashIp,
  acak,
  pkce,
};
