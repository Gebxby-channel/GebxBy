const ollamaUrl = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
const model = process.env.OLLAMA_MODEL ?? "qwen3:4b";
const apiUrl = process.env.WORKER_API_URL;
const workerToken = process.env.WORKER_TOKEN;
const topic = process.env.WORKER_TOPIC?.trim() || "ide tulisan komunitas yang menarik dan relevan";
const loop = process.argv.includes("--loop");
const intervalMinutes = Math.max(60, Number(process.env.WORKER_INTERVAL_MINUTES) || 360);

if (!apiUrl || !workerToken) {
  throw new Error("Isi WORKER_API_URL dan WORKER_TOKEN terlebih dahulu.");
}

const api = new URL(apiUrl);
if (api.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(api.hostname)) {
  throw new Error("WORKER_API_URL harus memakai HTTPS (kecuali localhost).");
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createDraft() {
  const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      format: "json",
      messages: [
        {
          role: "system",
          content: [
            "Kamu membantu menyusun DRAF tulisan berbahasa Indonesia untuk komunitas CodeXAvernico.",
            "Buat tulisan orisinal, natural, tidak mengaku sebagai manusia atau mengarang pengalaman pribadi/fakta.",
            "Jika topik menyangkut fakta yang belum pasti, tulis sebagai opini atau pertanyaan terbuka.",
            "Balas hanya JSON valid dengan properti head, subtitle, paragrafs, kategori.",
            "kategori harus salah satu dari General, Lore, Speculation, atau Utas.",
            "Untuk kategori Utas, head boleh string kosong. Isi paragrafs berupa teks biasa.",
          ].join(" "),
        },
        { role: "user", content: `Buat satu draf tulisan tentang: ${topic}` },
      ],
      options: { temperature: 0.8 },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!ollamaResponse.ok) {
    throw new Error(`Ollama gagal (${ollamaResponse.status}): ${await ollamaResponse.text()}`);
  }
  const ollamaData = await ollamaResponse.json();
  const content = ollamaData.message?.content;
  if (!content) throw new Error("Ollama mengembalikan jawaban kosong.");

  const generated = JSON.parse(content);
  const draft = {
    head: String(generated.head ?? "").slice(0, 180),
    subtitle: String(generated.subtitle ?? "").slice(0, 180),
    paragrafs: String(generated.paragrafs ?? "").slice(0, 20_000),
    kategori: String(generated.kategori ?? "General").slice(0, 60),
  };
  if (!draft.paragrafs.trim()) throw new Error("Draf dari Ollama tidak memiliki isi.");

  const backendResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Worker-Token": workerToken,
    },
    body: JSON.stringify(draft),
    signal: AbortSignal.timeout(60_000),
  });
  if (!backendResponse.ok) {
    throw new Error(`Backend gagal (${backendResponse.status}): ${await backendResponse.text()}`);
  }
  const saved = await backendResponse.json();
  console.log(`Draf tersimpan. ID: ${saved.idContent ?? saved.id ?? "lihat halaman Draft"}`);
  console.log(`Judul: ${draft.head || "Utas"} | Genre: ${draft.kategori}`);
}

do {
  try {
    await createDraft();
  } catch (error) {
    console.error(`Worker gagal: ${error.message}`);
    if (!loop) process.exitCode = 1;
  }

  if (loop) {
    console.log(`Menunggu ${intervalMinutes} menit sebelum membuat draf berikutnya.`);
    await wait(intervalMinutes * 60_000);
  }
} while (loop);
