# 0001 — Login Google sendiri, email disimpan privat

Status: diterima

## Konteks

Builder butuh login untuk mencegah penyalahgunaan kredit AI. Pilihan awalnya
Supabase Auth dengan Google. Supabase Auth selalu menyimpan email Google di
skema `auth.users`, jadi janji "tanpa email" tidak bisa ditegakkan.

Pemilik proyek kemudian meminta email tetap diambil untuk keamanan: mengenali
akun yang sama walau nama berubah, dan memblokir orang yang membuat akun baru
setelah diblokir.

## Keputusan

Pakai OAuth Google sendiri, bukan Supabase Auth.

- Scope: `openid profile email`.
- Identitas utama tetap `sub` Google, bukan email.
- Simpan `google_sub`, `name`, dan `email` di tabel `users`. Email bersifat
  privat: tidak pernah dikirim ke browser pengguna lain, tidak ditampilkan
  publik.
- Sesi sendiri: cookie HttpOnly, Secure, SameSite=Lax, ditandatangani HMAC,
  umur 7 hari. Tanpa refresh token.
- Supabase hanya dipakai sebagai database lewat `service_role` di server.

## Konsekuensi

- Kendali penuh atas data yang disimpan dan masa hidup sesi.
- Bisa memblokir berdasarkan `google_sub` maupun email.
- Kebijakan privasi wajib menyebut email disimpan.
- Kode lebih banyak: cookie `state`, PKCE, callback, verifikasi, sesi.
- Tidak ada pemulihan akun di MVP; kehilangan akses Google berarti kehilangan
  akses builder.

## Alternatif yang ditolak

- **Supabase Auth**: lebih sedikit kode, tetapi email tetap tersimpan tanpa
  kendali kita dan RLS harus memakai `auth.uid()`.
- **OAuth tanpa scope email**: privasi lebih kuat, tetapi kontrol abuse lebih
  lemah karena tidak ada penanda lintas akun.
