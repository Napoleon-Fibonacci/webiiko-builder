"use strict";

const BERKAS = ["index.html", "style.css", "script.js"];

const AWAL = {
  "index.html":
    '<!DOCTYPE html>\n<html lang="id">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Website baru</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main>\n    <h1>Halo!</h1>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>\n',
  "style.css": ":root { color-scheme: light; }\nbody { font-family: system-ui, sans-serif; margin: 0; padding: 32px; }\n",
  "script.js": "// Tulis interaksi di sini.\n",
};

function normalisasi(masukan) {
  const hasil = {};
  for (const nama of BERKAS) {
    const isi = masukan?.[nama];
    hasil[nama] = typeof isi === "string" ? isi : AWAL[nama];
  }
  return hasil;
}

function periksaAsetLuar(html, css) {
  const salah = [];
  const pola = [
    [/<script[^>]+src\s*=\s*["']\s*(https?:)?\/\//i, "script dari luar"],
    [/<link[^>]+href\s*=\s*["']\s*(https?:)?\/\//i, "stylesheet dari luar"],
    [/<(img|iframe|video|audio|source|embed|object)[^>]+src\s*=\s*["']\s*(https?:)?\/\//i, "media dari luar"],
    [/<form[^>]+action\s*=\s*["']\s*(https?:)?\/\//i, "form ke luar"],
    [/@import\s+(url\()?\s*["']?\s*(https?:)?\/\//i, "import CSS dari luar"],
    [/url\(\s*["']?\s*(https?:)?\/\//i, "URL luar di CSS"],
  ];
  for (const [re, pesan] of pola) {
    if (re.test(html) || re.test(css)) salah.push(pesan);
  }
  return salah;
}

function validasi(masukan, maksByte) {
  const files = normalisasi(masukan);
  const errors = [];

  for (const nama of BERKAS) {
    const ukuran = Buffer.byteLength(files[nama], "utf8");
    if (ukuran > maksByte) {
      errors.push(`${nama} terlalu besar (${Math.ceil(ukuran / 1024)} KB, maksimal ${Math.floor(maksByte / 1024)} KB)`);
    }
  }

  const html = files["index.html"];
  if (!/<html[\s>]/i.test(html)) errors.push("index.html tidak punya <html>");
  if (!/<body[\s>]/i.test(html)) errors.push("index.html tidak punya <body>");
  if (!/<\/html>\s*$/i.test(html.trim())) errors.push("index.html tidak ditutup </html>");

  const aset = periksaAsetLuar(html, files["style.css"]);
  for (const a of aset) errors.push(`aset eksternal dilarang: ${a}`);

  return { ok: errors.length === 0, errors, files };
}

module.exports = { BERKAS, AWAL, validasi, normalisasi };
