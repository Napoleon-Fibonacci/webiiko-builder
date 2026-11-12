# Panduan kerja

Ringkas: **Webiko Builder** — ruang kerja AI untuk pelajar SMP & SMA membuat
website statis, Bahasa Indonesia. Aplikasi subdomain Webiko. Frontend statis
(HTML/CSS/JS vanilla, tanpa framework, tanpa build step, tanpa dependency npm).
Backend berupa Vercel Functions di `api/` + Supabase.

Berkas utama:

- `index.html` — gerbang masuk + ruang kerja.
- `assets/css/builder.css` — token, komponen, tema terang/gelap, responsif.
- `assets/js/app.js` — sesi, project, loop Build, pratinjau, unduhan.
- `assets/js/tema.js` — pasang `data-tema` sebelum halaman digambar.
- `api/` — auth Google, project, Build, sesi, unduhan ZIP.
- `supabase/schema.sql` — tabel + RPC + RLS. `policies.sql` — tanpa policy.
- `skills/*.md` — aturan pasif yang disisipkan ke prompt Agent.
- `docs/adr/` — keputusan arsitektur.

## Aturan yang tidak boleh dilanggar

1. **Line ending CRLF.** Semua berkas repo pakai CRLF. Jangan pernah
   mengubahnya. Jangan pakai `sed -i`. Sesudah menulis berkas baru, pastikan
   CRLF. Verifikasi: `grep -qU $'\r' <berkas>` (harus cocok).
2. **`service_role` hanya di server.** Jangan pernah menaruh service role key,
   DB password, `SESSION_SECRET`, atau kunci Gonka di frontend. Browser tidak
   boleh memanggil Supabase atau Gonka langsung.
3. **Hasil situs selalu tiga berkas:** `index.html`, `style.css`, `script.js`.
   Tanpa aset eksternal, CDN, font internet, gambar `https://`, atau backend.
4. **Sandbox pratinjau:** iframe hanya `sandbox="allow-scripts"`. Jangan
   tambahkan `allow-same-origin`. Pratinjau memakai blob URL + CSP internal.
5. Tanpa JavaScript **tidak boleh ada isi tersembunyi**. Halaman masuk harus
   tetap terbaca; ruang kerja memang butuh JS dan boleh tersembunyi.
6. Gerak cuma pakai `transform` dan `opacity`, dan **mati total** saat
   `prefers-reduced-motion: reduce`. Tanpa library animasi.
7. Jangan refactor atau mengubah hal di luar yang diminta.
8. **Matikan semua proses uji begitu selesai** — server pratinjau, server mock,
   dan Chrome headless. Jangan pernah `taskkill /IM chrome.exe` /
   `killall chrome`; itu membunuh Chrome pribadi user. Bunuh **hanya** proses
   uji lewat PID atau `--user-data-dir=<temp>`.
9. **Bersihkan folder temp setelah tugas selesai.** Hapus screenshot, skrip
   harness, stub, salinan config, dan profil Chrome sementara di
   `C:\Users\Hype\AppData\Local\Temp\opencode`. Setelah bersih, isi folder itu
   harus kosong kecuali user minta berkasnya disimpan.

## Gaya & token

Neo-brutalis indigo pop: border tinta, bayangan keras ber-offset (tanpa blur),
kuning `#ffe14d` untuk aksi. Selalu pakai token di `assets/css/builder.css`;
jangan angka/warna mentah di komponen baru.

- Border: `--border` (3px), `--border-thin` (2px).
- Bayangan: `--shadow-sm`, `--shadow`, `--shadow-lg`.
- Radius dan spacing mengikuti token yang sudah ada.
- Font: `Segoe UI Web` dari `assets/fonts/segoe/`, disalin dari Webiko.
- Tema gelap hidup di satu blok `:root[data-tema="gelap"]` — tidak ada salinan
  di media query. Bawaan terang.
- `localStorage` tema: kunci `tema`, nilai `terang`/`gelap`.

## Alur kerja (wajib)

1. **Tanya dulu: mau di-mock atau langsung diterapkan?** Setelah paham tugas,
   tanya singkat ke user. Jangan otomatis mock terus-menerus tanpa diminta.
   Tiap tugas boleh beda.
   - **Mock**: tulis CSS/HTML percobaan di temp, suntik ke halaman asli atau
     serve terpisah, lalu screenshot. Tunjukkan opsi + jalur screenshot, dan
     tunggu persetujuan sebelum mengedit repo.
   - **Langsung**: terapkan ke repo dulu, verifikasi, lalu tunjukkan hasilnya.
2. Setelah diterapkan, verifikasi:
   - nol overflow horizontal di lebar 1440/1024/900/768/390/320;
   - tema terang dan gelap;
   - alur masuk, pilih project, kirim prompt, pratinjau, kode, unduh;
   - CRLF utuh.
3. Commit kecil per perubahan. `git init`/`git push` hanya kalau diminta.
4. Bersihkan temp dan matikan proses uji sebelum menutup tugas.

## Batas produk

- Kuota: 5 Build/hari/pengguna, maksimal 3 Project, 3.000.000 token/hari global,
  40 pesan terakhir disimpan.
- Agent maksimal 8 langkah, 200.000 token per Build, digerakkan browser satu
  langkah per request.
- Tidak ada hosting publik. Satu-satunya cara memakai hasil adalah unduh ZIP.
- Google OAuth sendiri, cookie sesi HttpOnly bertanda tangan HMAC.
- `BUILDER_OFF=1` mematikan Build tanpa deploy ulang.
- Turnstile ditunda sampai ada keputusan.

## Commit

Pesan konvensional + body berisi alasan dan perubahan. Contoh:

- `feat(builder): ...`, `fix(build): ...`, `style(pratinjau): ...`,
  `docs(readme): ...`.

## Bahasa

Balas singkat, Bahasa Indonesia. Pertahankan semua fakta teknis apa adanya:
path, perintah, nama API, angka, dan pesan error jangan diubah atau diringkas.
