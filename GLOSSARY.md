# Glosarium

Istilah yang dipakai di Webiko Builder. Satu istilah, satu arti.

## Webiko

Situs pembelajaran membuat website yang sudah ada di `webiko.my.id`.
Bukan tempat menyimpan hasil build.

## Webiko Builder

Aplikasi di subdomain Webiko tempat pengguna membuat situs dengan bantuan AI.
Bukan akun belajar Webiko; akunnya terpisah.

## Pengguna

Orang yang masuk lewat Google dan memiliki Project. Identitasnya adalah `sub`
Google, bukan email. Email disimpan privat untuk keamanan dan tidak pernah
ditampilkan. Bukan "siswa", karena akun belajar Webiko tidak dipakai di sini.

## Sesi

Bukti bahwa seorang Pengguna sudah masuk. Berupa cookie yang ditandatangani
server dan berumur terbatas. Bukan akun, dan bukan token Supabase.

## Project

Wadah milik satu Pengguna. Menyimpan Build terakhir dan percakapan yang
menghasilkannya. Satu Pengguna boleh punya beberapa Project.

## Build

Satu hasil generasi AI untuk sebuah Project. Build berikutnya menggantikan
Build sebelumnya; tidak ada riwayat versi di MVP.

## Site

Isi sebuah Build: tiga berkas tetap, yaitu `index.html`, `style.css`, dan
`script.js`. Bukan project framework, bukan kode backend.

## Preview

Tampilan Site di dalam iframe terisolasi di halaman builder. Bukan hosting
publik dan tidak punya alamat sendiri.

## Publish

Membuat Site bisa diakses publik. Tidak ada di MVP. Istilah ini disimpan
untuk fase berikutnya.

## Agent

Cara AI bekerja: menulis dan memeriksa berkas lewat beberapa langkah, bukan
satu jawaban sekali jadi.

## Skill

Dokumen pasif berisi aturan dan pengetahuan yang selalu disisipkan sebelum
percakapan Build dimulai, tanpa dipanggil Pengguna. Bukan alat yang bisa
dipakai Agent kapan saja, dan bukan template yang disalin mentah.

## Key slot

Satu kredensial API Gonka yang bisa dipakai bergiliran. Beberapa slot dipakai
supaya satu kunci yang habis tidak menghentikan pembuatan Site.
