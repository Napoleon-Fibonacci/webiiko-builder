"use strict";

(function () {
  const notif = document.getElementById("pesan-blokir");

  if (new URLSearchParams(location.search).get("diblokir") === "1" && notif) {
    notif.hidden = false;
  }

  if (!window.fetch) return;

  fetch("/api/sesi", { headers: { accept: "application/json" } })
    .then((res) => (res.ok ? res.json() : null))
    .then((sesi) => {
      if (sesi && sesi.masuk) location.replace("/builder");
    })
    .catch(() => {
      /* Gagal cek sesi: biarkan halaman masuk tetap terbuka. */
    });
})();
