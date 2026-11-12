# 0002 — Loop Agent digerakkan browser

Status: diterima

## Konteks

Satu Build memakai Agent sampai 8 langkah, dengan batas 200.000 token.
Delapan panggilan model bisa memakan 80–240 detik, dan satu function Vercel
Hobby berhenti di 300 detik. Menjalankan seluruh loop dalam satu request
berarti satu langkah lambat bisa menghabiskan seluruh jatah waktu. Antrean
background menambah infrastruktur yang belum dibutuhkan.

## Keputusan

Browser menggerakkan loop, satu langkah per request.

- `POST /api/build-mulai` membuat Build dan menjalankan langkah pertama.
- `POST /api/build-lanjut` menjalankan tepat satu langkah berikutnya.
- Status Build, jumlah langkah, dan token disimpan di database.
- Batas langkah, token, dan kuota dicek server pada setiap request.
- Satu Build aktif per pengguna.
- Build yang tidak menerima request selama 120 detik dianggap mati dan
  kuncinya dilepas.

## Konsekuensi

- Jalan di Vercel Hobby maupun Pro tanpa antrean atau function berdurasi panjang.
- Key API tetap hanya di server; browser hanya menerima status dan hasil.
- Request lebih banyak, dan penutupan tab di tengah Build meninggalkan status
  yang harus dibersihkan lewat batas 120 detik.
- Setiap langkah harus aman diulang: server menolak langkah ganda untuk Build
  yang sudah selesai.

## Alternatif yang ditolak

- **Satu request sinkron**: sederhana, tetapi butuh plan Pro dan tetap berisiko
  timeout.
- **Antrean background + polling**: paling tahan gangguan, tetapi menambah
  komponen yang belum perlu.
