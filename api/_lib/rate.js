"use strict";

const { rpc } = require("./db");

async function batasi(scope, subject, detik, maks) {
  const jendela = new Date(Math.floor(Date.now() / 1000 / detik) * detik * 1000).toISOString();
  const lolos = await rpc("naikkan_rate", {
    p_scope: scope,
    p_subject: subject,
    p_window: jendela,
    p_limit: maks,
  });
  return lolos === true;
}

module.exports = { batasi };
