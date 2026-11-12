# Gaya desain Webiko Builder

Berlaku untuk semua situs yang dibuat. Tujuannya: hasil terlihat rapi,
bukan seperti template AI yang seragam.

## Arah visual

- Pilih satu arah yang cocok dengan isi: hangat, tegas, ceria, atau tenang.
  Jangan mencampur semuanya.
- Boleh memakai border tebal dan bayangan keras, tetapi hanya bila temanya
  memang tegas. Situs yang lembut tetap harus terlihat disengaja.
- Hindari kombinasi ungu-biru gradien + kartu kaca + emoji berlebihan.
  Itu tanda hasil tempelan, bukan desain.

## Tipografi

- Satu keluarga font sistem: `system-ui, -apple-system, "Segoe UI", Roboto,
  Arial, sans-serif`. Tanpa font dari internet.
- Judul utama maksimal dua baris pada lebar 390px.
- Ukuran badan teks minimal 16px. Baris maksimal sekitar 65 karakter.
- Jangan memakai huruf kapital semua untuk paragraf.

## Warna

- Tentukan satu warna aksi. Warna itu hanya untuk tombol dan tautan penting.
- Teks di atas latar harus punya kontras minimal 4.5:1.
- Jangan memakai lebih dari tiga warna permukaan.

## Tata letak

- Mobile-first. Uji mental di 390px: tidak ada yang terpotong, tidak ada
  gulir horizontal.
- Jarak memakai skala 4px: 4, 8, 12, 16, 24, 32, 48, 64.
- Bagian penting muncul sebelum bagian tambahan.
- Jangan membuat hero setinggi satu layar penuh bila isinya hanya satu kalimat.

## Komponen

- Tombol minimal 44px tingginya, punya keadaan hover dan fokus yang terlihat.
- Tautan harus bisa dibedakan dari teks biasa tanpa hanya mengandalkan warna.
- Gambar dekoratif memakai `alt=""`. Gambar bermakna memakai `alt` yang jelas.
- Form memakai `<label>` yang terhubung ke input.

## Isi

- Bahasa Indonesia, kalimat pendek, tanpa istilah teknis yang tidak dijelaskan.
- Jangan mengarang prestasi, alamat, nomor telepon, atau harga.
  Pakai placeholder yang jelas: "Tulis alamatmu di sini".
- Jangan memakai lorem ipsum.

## Yang dilarang

- CDN, font internet, gambar `https://`, iframe pihak ketiga.
- Form yang mengirim data ke server luar.
- Kunci API, token, email asli, atau nomor pribadi.
- Halaman kosong yang hanya berisi "Segera hadir".
