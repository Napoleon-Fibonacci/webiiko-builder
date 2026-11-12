"use strict";

const { pembungkus } = require("./_lib/http");
const { config } = require("./_lib/env");
const { bacaOauth, hapusOauth, setSesi } = require("./_lib/sesi");
const { insert } = require("./_lib/db");

function halamanGagal(res, pesan) {
  res.statusCode = 400;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(
    `<!DOCTYPE html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Masuk gagal</title><body style="font-family:system-ui;padding:40px;max-width:520px;margin:auto"><h1>Masuk gagal</h1><p>${pesan}</p><p><a href="/">Kembali ke halaman masuk</a></p></body></html>`,
  );
}

function bacaIdToken(idToken) {
  const bagian = String(idToken || "").split(".");
  if (bagian.length !== 3) throw new Error("id_token tidak valid.");
  const payload = JSON.parse(Buffer.from(bagian[1], "base64url").toString("utf8"));
  const sekarang = Math.floor(Date.now() / 1000);
  if (payload.aud !== config.googleId) throw new Error("Token bukan untuk aplikasi ini.");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(payload.iss)) {
    throw new Error("Penerbit token tidak dikenal.");
  }
  if (!payload.exp || payload.exp < sekarang) throw new Error("Token sudah kedaluwarsa.");
  if (!payload.sub) throw new Error("Token tanpa identitas.");
  return payload;
}

module.exports = pembungkus(async (req, res) => {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("allow", "GET");
    return res.end("Metode tidak diizinkan.");
  }

  const cookie = bacaOauth(req);
  hapusOauth(res);

  const url = new URL(req.url, config.appUrl);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!cookie || !state || cookie.state !== state) {
    return halamanGagal(res, "Sesi masuk tidak cocok. Coba masuk lagi.");
  }
  if (!code) return halamanGagal(res, "Google tidak mengirim kode masuk.");

  const body = new URLSearchParams({
    code,
    client_id: config.googleId,
    client_secret: config.googleSecret,
    redirect_uri: `${config.appUrl}/api/auth-callback`,
    grant_type: "authorization_code",
    code_verifier: cookie.verifier,
  });

  const tukar = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tukar.ok) {
    console.error("[auth] tukar token gagal", tukar.status, (await tukar.text()).slice(0, 300));
    return halamanGagal(res, "Google menolak pertukaran token. Coba lagi.");
  }

  const token = await tukar.json();
  let profil;
  try {
    profil = bacaIdToken(token.id_token);
  } catch (e) {
    return halamanGagal(res, e.message);
  }

  const baris = await insert(
    "users",
    {
      google_sub: profil.sub,
      email: profil.email || null,
      name: profil.name || (profil.email ? profil.email.split("@")[0] : "Pengguna"),
    },
    { onConflict: "google_sub" },
  );

  const user = Array.isArray(baris) ? baris[0] : null;
  if (!user) return halamanGagal(res, "Akun tidak bisa disimpan.");
  if (user.banned) {
    res.statusCode = 302;
    res.setHeader("location", "/?diblokir=1");
    return res.end();
  }

  setSesi(res, user.id);
  res.statusCode = 302;
  res.setHeader("location", "/");
  res.end();
});
