# FreshNote

FreshNote adalah website berbasis aplikasi untuk menyimpan bahan, memantau masa habis, melihat kategori bahan, dan menandai item favorit. Proyek ini menggunakan HTML, CSS, JavaScript, dan Supabase.

## Struktur file

```
FreshNote_Final/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── data.js
│   └── app.js
├── assets/
│   ├── logo.png
│   └── promo1.png
└── schema.sql
```

## Cara pakai Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor** lalu jalankan isi `schema.sql`.
3. Buka **Project Settings → API**.
4. Salin:
   - **Project URL**
   - **anon / publishable key**
5. Tempel ke `js/config.js`.

Contoh:

```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_xxxxx';
```

## Supaya registrasi/login lancar

- Buka **Authentication → URL Configuration**.
- Isi **Site URL** dan **Redirect URLs** dengan domain publish kamu, misalnya:

```text
https://namaproject.vercel.app
```

- Kalau mau user langsung masuk tanpa cek email, buka **Authentication → Providers → Email** lalu matikan **Confirm email**.
- Kalau Google login mau dipakai, aktifkan provider Google di Supabase dan ubah `GOOGLE_OAUTH_ENABLED` menjadi `true`.

## Deploy ke Vercel

1. Upload folder ini ke GitHub.
2. Masuk ke Vercel.
3. Import repository dari GitHub.
4. Deploy.
5. Setelah dapat domain Vercel, masukkan domain itu ke Site URL dan Redirect URLs di Supabase.

## Fitur

- Login dan registrasi dengan Supabase Auth
- Beranda dengan kategori bahan segar dan makanan/minuman
- Detail bahan
- Pengaturan pengingat
- Daftar item tersimpan
- Favorit
- Filter dan sort
- Export CSV untuk plan premium
- Notifikasi browser untuk plan premium
- Pembatasan 8 item untuk free plan

## Catatan plan premium

Plan premium belum memakai payment gateway. Untuk versi gratis, plan bisa diubah manual di tabel `profiles` dari `free` ke `premium`.
