"use strict";

const { pembungkus, kirim } = require("./_lib/http");
const { config } = require("./_lib/env");
const { setOauth, acak, pkce, hashIp } = require("./_lib/sesi");
const { batasi } = require("./_lib/rate");

module.exports = pembungkus(async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return kirim(res, 405, { galat: "Metode tidak diizinkan." });
  }
  if (config.builderOff) return kirim(res, 503, { galat: "Builder sedang dimatikan." });

  const lolos = await batasi("login", hashIp(req), 60, 10);
  if (!lolos) return kirim(res, 429, { galat: "Terlalu banyak percobaan masuk. Tunggu sebentar." });

  const state = acak(24);
  const verifier = acak(32);
  setOauth(res, { state, verifier });

  const params = new URLSearchParams({
    client_id: config.googleId,
    redirect_uri: `${config.appUrl}/api/auth-callback`,
    response_type: "code",
    scope: "openid profile email",
    state,
    code_challenge: pkce(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });

  res.statusCode = 302;
  res.setHeader("location", `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.end();
});
