# Webiko Builder

Ruang kerja AI untuk pelajar SMP & SMA membuat website statis. Tulis keinginan
dalam Bahasa Indonesia, Agent menyusun `index.html`, `style.css`, dan
`script.js`, lalu hasilnya bisa dipratinjau dan diunduh sebagai ZIP.

Aplikasi ini bagian dari Webiko. Frontend statis, backend Vercel Functions,
database Supabase. Tidak ada framework, build step, atau dependency npm di
frontend.

## Isi repo

- `index.html` — halaman masuk: landing + tombol Google.
- `builder.html` — ruang kerja: project, chat, pratinjau, kode, unduhan.
- `assets/css/builder.css` — token, komponen, tema terang/gelap, responsif.
- `assets/js/masuk.js` — cek sesi di halaman masuk, lempar ke ruang kerja.
- `assets/js/app.js` — sesi, project, loop Build, pratinjau, kode, unduhan.
- `assets/js/tema.js` — pasang tema sebelum halaman digambar.
- `assets/fonts/segoe/` — font Segoe UI Web lokal.
- `api/` — Google OAuth, sesi, project, Build, dan ZIP.
- `supabase/schema.sql` — tabel, RPC, RLS.
- `skills/` — aturan desain pasif yang disisipkan ke prompt Agent.
- `docs/adr/` — catatan keputusan arsitektur.

## Menyiapkan Supabase

1. Buat project Supabase.
2. Buka SQL Editor, jalankan isi `supabase/schema.sql` sekali. Skrip aman
   dijalankan ulang.
3. Jangan menambahkan policy publik. Semua akses lewat server memakai
   `SUPABASE_SERVICE_ROLE_KEY`. `supabase/policies.sql` hanya catatan bahwa
   RLS aktif tanpa policy.
4. Simpan `Project URL` dan `service_role` key. Keduanya hanya untuk env server
   Vercel, jangan pernah masuk ke frontend.

## Menyiapkan Google OAuth

1. Buka Google Cloud Console, buat project, lalu isi OAuth consent screen.
2. Buat OAuth Client ID tipe **Web application**.
3. Tambahkan Authorized redirect URI:
   - Produksi: `https://<domain-anda>/api/auth-callback`
   - Lokal: `http://localhost:3000/api/auth-callback`
4. Simpan Client ID dan Client Secret.

Callback memakai PKCE, state cookie, dan cookie sesi HttpOnly bertanda tangan
HMAC. Scope: `openid profile email`.

## Environment Vercel

Salin `.env.example`, lalu isi:

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `APP_URL` | ya | Alamat aplikasi tanpa garis miring akhir. |
| `SESSION_SECRET` | ya | String acak panjang, minimal 32 karakter. |
| `GOOGLE_CLIENT_ID` | ya | Client ID OAuth. |
| `GOOGLE_CLIENT_SECRET` | ya | Client Secret OAuth. |
| `SUPABASE_URL` | ya | URL project Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | Service role key. Server saja. |
| `GONKA_BASE_URL` | tidak | Default sudah menunjuk endpoint Gonka. |
| `GONKA_KEYS` | ya untuk Build | Satu atau beberapa key, dipisah koma. Urutan = failover. |
| `GONKA_MODEL` | tidak | Kosong = model pertama dari `GET /models`. |
| `MAX_BUILDS_PER_DAY` | tidak | Default `5`. |
| `MAX_PROJECTS` | tidak | Default `3`. |
| `MAX_BUILD_STEPS` | tidak | Default `8`. |
| `MAX_TOKENS_PER_BUILD` | tidak | Default `200000`. |
| `MAX_TOKENS_PER_DAY` | tidak | Default `3000000`. |
| `MAX_PROMPT_CHARS` | tidak | Default `2000`. |
| `MAX_FILE_BYTES` | tidak | Default `60000` per berkas. |
| `BUILDER_OFF` | tidak | `1` mematikan Build tanpa deploy ulang. |

Nilai `MAX_*` dan `BUILDER_OFF` bisa diubah di Vercel lalu redeploy ringan.
Jangan taruh nilai rahasia di `index.html` atau `assets/`.

## Menjalankan lokal

Frontend tidak bisa dijalankan hanya dengan membuka `index.html`: API harus
hidup. Gunakan Vercel CLI:

```bash
npm i -g vercel
vercel dev --listen 3000
```

Isi env lokal di `.env` (format sama dengan `.env.example`), lalu buka
`http://localhost:3000`. `APP_URL` harus `http://localhost:3000` dan redirect
URI Google harus cocok persis. `SESSION_SECRET`, key Supabase, key Gonka, dan
secret Google tetap hanya di server.

Alternatif: deploy preview ke Vercel, isi env di dashboard, dan tambahkan
domain preview ke Authorized redirect URI Google.

## Alur Build

1. Browser mengirim prompt ke `/api/build-mulai`.
2. Server memanggil Gonka sekali, menjalankan satu langkah Agent, menyimpan
   pesan dan berkas, lalu mengembalikan status.
3. Jika belum selesai, browser memanggil `/api/build-lanjut` satu langkah per
   request sampai selesai atau mencapai 8 langkah.
4. Hasil divalidasi: wajib tiga berkas, tanpa aset eksternal, ukuran di bawah
   batas.
5. Pratinjau memakai blob URL di iframe `sandbox="allow-scripts"` dengan CSP
   internal. Tidak ada `allow-same-origin`.
6. Unduhan ZIP dibuat oleh `/api/unduh`. Tidak ada hosting publik.

## Batas produk

- 5 Build per hari per pengguna.
- Maksimal 3 Project per pengguna.
- 3.000.000 token per hari global.
- 40 pesan terakhir disimpan per Project.
- Agent maksimal 8 langkah dan 200.000 token per Build.
- Satu-satunya cara memakai hasil adalah unduh ZIP.
- Tidak ada CDN, font internet, gambar `https://`, atau backend di situs hasil.

## Deploy

1. Hubungkan repo ke Vercel.
2. Isi environment variables di dashboard.
3. Pastikan `APP_URL` memakai domain produksi dan redirect URI Google sudah
   ditambahkan.
4. Deploy. `vercel.json` menangani header keamanan, CSP, dan `includeFiles`
   untuk folder `skills/`.

## Pemeriksaan cepat

```bash
node --check api/*.js api/_lib/*.js assets/js/*.js
```

Verifikasi manual: masuk, buat/pilih project, kirim prompt, tunggu Build,
buka pratinjau, buka tab kode, unduh ZIP, cek tema terang/gelap di lebar
1440/1024/900/768/390/320.

## Keamanan

- `service_role`, `SESSION_SECRET`, dan key Gonka hanya di server.
- Browser tidak memanggil Supabase atau Gonka langsung.
- Cookie sesi HttpOnly, SameSite, ditandatangani HMAC.
- Pratinjau tidak boleh mendapat `allow-same-origin`.
- Rate limit login dan Build disimpan di database.
