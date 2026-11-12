"use strict";

const fs = require("fs");
const path = require("path");

const BATAS_KARAKTER = 60000;
let cache;

const DASAR = `Kamu membuat website statis untuk pelajar Indonesia.
Aturan wajib:
- Hasil hanya tiga berkas: index.html, style.css, script.js.
- index.html menautkan style.css dan script.js dengan path relatif.
- Tanpa framework, tanpa CDN, tanpa aset dari internet (gambar, font, skrip).
  Pakai SVG inline, emoji, atau bentuk CSS.
- Tanpa backend, tanpa form yang mengirim data ke server luar.
- Bahasa Indonesia yang ramah untuk SMP/SMA.
- Desain responsif, kontras teks memadai, dan bisa dipakai tanpa mouse.
- Jangan menulis kunci API, email pribadi, atau data sensitif.
- Sebelum menyatakan selesai, panggil validate_site sampai tidak ada kesalahan.`;

function bacaSkills() {
  if (cache !== undefined) return cache;
  const folder = path.join(process.cwd(), "skills");
  let isi = "";
  try {
    const berkas = fs
      .readdirSync(folder)
      .filter((f) => f.toLowerCase().endsWith(".md") && f.toLowerCase() !== "readme.md")
      .sort();
    for (const f of berkas) {
      const teks = fs.readFileSync(path.join(folder, f), "utf8").trim();
      if (!teks) continue;
      isi += `\n\n## Skill: ${f}\n${teks}`;
    }
  } catch (e) {
    console.error("[skills] gagal membaca folder skills:", e.message);
  }
  cache = (DASAR + isi).slice(0, BATAS_KARAKTER);
  return cache;
}

module.exports = { bacaSkills };
