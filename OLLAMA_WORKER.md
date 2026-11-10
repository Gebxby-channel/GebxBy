# Worker Ollama lokal

Worker ini berjalan di PC, meminta Ollama menyusun satu draf tulisan, lalu mengirimkannya ke backend sebagai **draft**. Worker tidak menerbitkan tulisan, memberi vote, membuat komentar, atau mengakses MongoDB. Periksa dan terbitkan draf dari aplikasi secara manual.

## 1. Siapkan akun khusus

Buat atau pilih akun non-admin khusus untuk draf AI. Ambil UUID akun tersebut dari data pengguna MongoDB atau endpoint profil yang menampilkan `userID`. Jangan gunakan akun admin.

## 2. Atur environment backend

Tambahkan dua environment variable di deployment Koyeb, lalu deploy backend:

- `AI_WORKER_TOKEN`: rahasia acak minimal 32 byte. Buat di PowerShell dengan:

  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- `AI_WORKER_USER_ID`: UUID akun khusus di langkah 1.

Token yang sama dipakai worker lokal. Jangan taruh token di frontend, Git, atau kirim lewat chat. Endpoint hanya menerima HTTPS di deployment.

## 3. Jalankan sekali dari PowerShell

Pastikan Ollama aktif dan model sudah tersedia (`ollama list`). Dari folder proyek:

```powershell
$env:WORKER_API_URL = "https://URL-BACKEND-KOYEB/api/worker/drafts"
$env:WORKER_TOKEN = "TOKEN-YANG-SAMA-DENGAN-KOYEB"
$env:OLLAMA_MODEL = "qwen3:4b"
$env:WORKER_TOPIC = "topik yang ingin dibahas"
node .\worker\ollama-worker.mjs
```

Jalankan sekali dulu. Draf akan masuk ke akun khusus tersebut dan dapat ditinjau di aplikasi.

Untuk mode berulang, tambahkan `--loop`; jeda default enam jam. Bisa diatur, misalnya:

```powershell
$env:WORKER_INTERVAL_MINUTES = "360"
node .\worker\ollama-worker.mjs --loop
```

Terminal harus tetap terbuka dan PC tidak boleh tidur. Jika ingin berjalan otomatis setelah restart, langkah berikutnya adalah mendaftarkannya di Windows Task Scheduler. Jangan jalankan mode berulang sebelum memastikan satu kali pembuatan draf berhasil.
