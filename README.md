# KESMA NEWS — Portal Info Beasiswa & Lomba

Website informatif dari **Departemen Advokasi & Kesejahteraan Mahasiswa (Adkesma)**, Himpunan Mahasiswa Teknologi Kedokteran (HMTK).

## 🌐 Akses Website

Buka file `index.html` di browser, atau deploy ke Netlify/GitHub Pages.

---

## 📝 Cara Update Data

### Menambah Info Beasiswa Baru

1. Buka file `data/beasiswa.json`
2. Tambahkan entry baru di dalam array `[]` (jangan lupa koma setelah entry sebelumnya):

```json
{
    "id": 7,
    "nama": "Nama Beasiswa Baru",
    "status": "Buka",
    "kategori": "Berprestasi",
    "deadline": "2026-12-31",
    "persyaratan": [
        "Persyaratan 1",
        "Persyaratan 2"
    ],
    "benefit": [
        "Benefit 1",
        "Benefit 2"
    ],
    "linkDaftar": "https://link-pendaftaran.com",
    "linkGuidebook": "https://link-guidebook.com",
    "timelinePenting": "Info timeline penting"
}
```

3. Save file

### Menambah Info Lomba Baru

Sama seperti beasiswa, buka `data/lomba.json` dan tambahkan entry baru.

### Tips Penting

- **ID** harus unik (gunakan angka yang belum dipakai)
- **Status** hanya boleh `"Buka"` atau `"Tutup"`
- **Deadline** formatnya `"YYYY-MM-DD"` (contoh: `"2026-12-31"`)
- **Kategori** beasiswa: `"Berprestasi"` atau `"Kurang Mampu"`
- **Kategori** lomba: `"Akademik"`, `"Teknologi"`, atau `"Seni"`
- Jika tidak ada link, isi dengan string kosong `""`
- Pastikan format JSON valid (cek di [jsonlint.com](https://jsonlint.com))

### Mengubah Status Beasiswa/Lomba

Cari entry yang ingin diubah, ganti value `"status"`:
- Dari `"Buka"` menjadi `"Tutup"` (atau sebaliknya)

---

## 🚀 Deploy ke Netlify (Gratis)

1. Buka [netlify.com](https://netlify.com) dan buat akun (gratis)
2. Klik **"Add new site"** → **"Deploy manually"**
3. Drag & drop seluruh folder `KESMANEWS` ke area upload
4. Tunggu beberapa detik, website langsung live!
5. URL otomatis diberikan (contoh: `random-name.netlify.app`)
6. Bisa rename URL di **Site settings** → **Change site name**

### Update Website Setelah Edit Data

Setelah mengubah data JSON, upload ulang folder ke Netlify:
1. Masuk ke dashboard Netlify
2. Klik site kamu → **Deploys**
3. Drag & drop folder `KESMANEWS` lagi

---

## 📁 Struktur File

```
KESMANEWS/
├── index.html          → Halaman utama website
├── style.css           → Semua styling & desain
├── app.js              → Logic: render data, filter, search, dll
├── data/
│   ├── beasiswa.json   → Data info beasiswa
│   └── lomba.json      → Data info lomba
├── assets/
│   ├── logo-hmtk.jpeg  → Logo himpunan
│   └── poster/         → Folder untuk poster (opsional)
└── README.md           → File ini
```

---

## ✨ Fitur

- 🔍 Search & filter berdasarkan kategori dan status
- ⏰ Countdown timer deadline pendaftaran
- 🌙 Dark mode
- 📱 Responsive (mobile-friendly)
- 🎨 Desain modern dengan glassmorphism
- 📋 Detail modal untuk setiap beasiswa/lomba
- 🔗 Link langsung ke pendaftaran & guidebook

---

*Dibuat dengan ❤️ oleh Departemen Adkesma HMTK*
