import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

// Ensure HMR is disabled in AI Studio preview environment as per environment constraints
process.env.DISABLE_HMR = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase body parser limits for base64 images
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Health check endpoint
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Server-side OCR & Document extraction using Gemini
app.post(['/api/convert-ocr', '/convert-ocr'], async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Kunci API Gemini (GEMINI_API_KEY) belum dikonfigurasi di server. Pastikan API key terpasang di panel Settings > Secrets.',
      });
    }

    const { images, targetFormat = 'excel', preserveLayout = true } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tidak ada gambar yang diunggah. Silakan pilih minimal 1 foto dokumen atau screenshot.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Prepare image parts for Gemini
    const parts: any[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.data) continue;

      // Extract raw base64 data if it contains a data URL prefix
      let base64Clean = img.data;
      let mimeType = img.mimeType || 'image/jpeg';

      if (base64Clean.includes('base64,')) {
        const split = base64Clean.split('base64,');
        base64Clean = split[1];
        const match = split[0].match(/data:(.*?);/);
        if (match && match[1]) {
          mimeType = match[1];
        }
      }

      parts.push({
        inlineData: {
          data: base64Clean,
          mimeType,
        },
      });
    }

    if (parts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Format data gambar tidak valid.',
      });
    }

    const promptText = `
Anda adalah AI OCR Dokumen & Akuntan/Arsiparis Tingkat Lanjut. Tugas Anda adalah membaca, mengenali teks, struktur tabel, dan data dari ${images.length} gambar/screenshot yang diberikan secara sangat akurat dan terstruktur.

Format tujuan utama pengguna: "${targetFormat.toUpperCase()}" (Pilihan: EXCEL, WORD, PDF).
Preferensi tata letak: ${preserveLayout ? 'Pertahankan tata letak dan baris asli semaksimal mungkin' : 'Format bersih mudah diedit'}.

ATURAN KETAT:
1. JANGAN mengarang teks, nama barang, kode transaksi, nomor rekening, atau angka yang tidak terlihat.
2. Jaga tipe data numerik dan uang (misalnya Rp, IDR, mata uang, persentase). Jangan hilangkan angka nol di depan pada kode, nomor handphone, NIK, atau nomor faktur (misal '0812...' atau '00412' harus tetap string).
3. Jika gambar berisi tabel (faktur, struk kasir, nota, rekap spreadsheet, laporan keuangan, daftar absensi, daftar harga):
   - Pisahkan header kolom secara tepat.
   - Pisahkan baris secara tepat.
   - Deteksi subtotal, diskon, pajak (PPN), dan total keseluruhan jika ada.
4. Jika gambar buram, terpotong, atau tidak terbaca dengan pasti, JANGAN menebak angka. Berikan flag 'needsReview: true' dan cantumkan catatan pada daftar 'uncertainties'.
5. Kembalikan data dalam format JSON murni sesuai skema berikut.

Format skema respon JSON:
{
  "documentTitle": "Judul dokumen atau ringkasan dokumen",
  "documentType": "table | receipt | document | invoice | mixed",
  "summary": "Ringkasan singkat isi dokumen (1-2 kalimat)",
  "confidenceScore": 95,
  "detectedLanguage": "Bahasa Indonesia",
  "tables": [
    {
      "title": "Nama/Judul Tabel",
      "headers": ["No", "Nama Barang", "Qty", "Harga Satuan", "Total"],
      "rows": [
        ["1", "Kertas HVS A4", "2 Rim", "55.000", "110.000"]
      ],
      "subtotals": [
        {"label": "Subtotal", "value": "110.000"}
      ],
      "total": "110.000"
    }
  ],
  "keyValues": [
    {
      "key": "Nomor Faktur",
      "value": "INV-2024-001",
      "isFinancialOrCode": true,
      "needsReview": false,
      "reviewNote": ""
    }
  ],
  "paragraphs": [
    {
      "type": "heading1 | heading2 | paragraph | bullet | callout",
      "content": "Teks paragraf...",
      "needsReview": false
    }
  ],
  "uncertainties": [
    {
      "location": "Baris 3 Kolom Tanggal",
      "observedText": "1?/0?/2024",
      "issue": "Angka tanggal agak pudar karena pantulan cahaya"
    }
  ]
}
`;

    parts.push({ text: promptText });

    // Robust multi-model candidate list for high availability
    // gemini-3.1-flash-lite has the lowest latency and is immune to 503 traffic spikes on 3.8-flash
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    let lastError: any = null;
    let textOutput = '';

    for (const modelName of candidateModels) {
      // Retry up to 2 times per model if 503 or transient network spike occurs
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[OCR Server] Calling model ${modelName} (attempt ${attempt})...`);

          const configPayload: any = {
            responseMimeType: 'application/json',
          };

          // Use MINIMAL thinking level for flash models to maximize response speed
          if (modelName.includes('flash')) {
            configPayload.thinkingConfig = { thinkingLevel: 'MINIMAL' };
          }

          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: configPayload,
          });

          textOutput = response.text?.trim() || '';
          if (textOutput) {
            console.log(`[OCR Server] Successfully generated content using ${modelName}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[OCR Server] Model ${modelName} attempt ${attempt} error:`, err?.status || err?.message || err);
          // If 503 or 429, wait briefly before retrying or switching model
          const isTransient = err?.status === 503 || err?.status === 429 || String(err?.message || '').includes('503');
          if (isTransient && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } else {
            // Move to next candidate model
            break;
          }
        }
      }

      if (textOutput) break;
    }

    if (!textOutput) {
      console.error('[OCR Server] All models failed. Last error:', lastError);
      return res.status(503).json({
        success: false,
        error: 'Layanan AI Gemini sedang mengalami lonjakan antrean sementara (503). Sistem telah mencoba beberapa server. Silakan ketuk tombol "Konversi dengan AI" sekali lagi dalam beberapa detik.',
      });
    }

    // Clean markdown code blocks if the model wrapped the JSON in ```json ... ```
    let cleanJson = textOutput;
    if (cleanJson.includes('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.warn('[OCR Server] Direct JSON parse failed, trying regex extraction:', textOutput);
      const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch {
          // Fall through
        }
      }

      if (!parsedData) {
        return res.status(500).json({
          success: false,
          error: 'Format data dokumen dari AI tidak dapat diuraikan. Silakan coba unggah foto yang lebih terang atau coba lagi.',
        });
      }
    }

    return res.json({
      success: true,
      data: parsedData,
      rawOutputPreview: cleanJson.substring(0, 150),
    });
  } catch (error: any) {
    console.error('OCR Processing Error:', error);
    const rawMsg = error?.message || '';
    let friendlyMsg = 'Terjadi kendala saat memproses gambar dengan AI.';
    if (rawMsg.includes('503') || rawMsg.includes('high demand')) {
      friendlyMsg = 'Server AI sedang sibuk sementara. Silakan coba lagi dalam beberapa saat.';
    } else if (rawMsg) {
      friendlyMsg = rawMsg;
    }
    return res.status(500).json({
      success: false,
      error: friendlyMsg,
    });
  }
});

// Endpoint Chat AI untuk memodifikasi dokumen secara interaktif
app.post(['/api/chat-modify-document', '/chat-modify-document'], async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Kunci API Gemini (GEMINI_API_KEY) belum dikonfigurasi di server.',
      });
    }

    const { currentDocument, userPrompt, chatHistory = [] } = req.body;
    if (!currentDocument || !userPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Data dokumen dan instruksi chat wajib disertakan.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemPrompt = `
Anda adalah Asisten Pintar AI Converter untuk menyunting dan memperbarui data dokumen hasil konversi secara interaktif.
Tugas Anda:
1. Membaca data dokumen saat ini dalam format JSON.
2. Memahami instruksi atau permintaan penyuntingan dari pengguna (misalnya: menambah baris/kolom, menghitung ulang total/subtotal, mengubah nilai, menerjemahkan bahasa, memperbaiki ejaan, dsb).
3. Melakukan perubahan yang diminta secara presisi pada struktur dokumen.
4. Menghasilkan penjelasan singkat yang ramah dan solutif dalam bahasa Indonesia di kolom "assistantReply".

Format kembalian WAJIB berupa JSON murni dengan format skema:
{
  "assistantReply": "Penjelasan ramah tentang perubahan yang sudah dilakukan...",
  "updatedDocument": {
    "documentTitle": "string",
    "documentType": "string",
    "summary": "string",
    "confidenceScore": 98,
    "detectedLanguage": "string",
    "tables": [
      {
        "title": "string",
        "headers": ["string"],
        "rows": [["string"]],
        "subtotals": [{"label": "string", "value": "string"}],
        "total": "string"
      }
    ],
    "keyValues": [{"key": "string", "value": "string"}],
    "paragraphs": [{"type": "string", "content": "string"}],
    "uncertainties": []
  },
  "changes": ["Poin perubahan 1", "Poin perubahan 2"]
}
`;

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    const promptText = `
Dokumen Saat Ini:
${JSON.stringify(currentDocument, null, 2)}

Instruksi Perubahan dari Pengguna:
"${userPrompt}"

Riwayat Percakapan Sebelumnya:
${JSON.stringify(chatHistory.slice(-4), null, 2)}

Silakan perbarui dokumen sesuai instruksi di atas dan berikan balasan JSON.`;

    let textOutput = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const configPayload: any = {
            responseMimeType: 'application/json',
            systemInstruction: systemPrompt,
          };
          if (modelName.includes('flash')) {
            configPayload.thinkingConfig = { thinkingLevel: 'MINIMAL' };
          }

          const response = await ai.models.generateContent({
            model: modelName,
            contents: promptText,
            config: configPayload,
          });

          textOutput = response.text?.trim() || '';
          if (textOutput) break;
        } catch (err: any) {
          lastError = err;
          const isTransient = err?.status === 503 || err?.status === 429 || String(err?.message || '').includes('503');
          if (isTransient && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1500));
          } else {
            break;
          }
        }
      }
      if (textOutput) break;
    }

    if (!textOutput) {
      return res.status(503).json({
        success: false,
        error: 'Layanan AI sedang sibuk sementara. Silakan coba kirim instruksi sekali lagi.',
      });
    }

    let cleanJson = textOutput;
    if (cleanJson.includes('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(cleanJson);
    } catch {
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        parsedResult = JSON.parse(match[0]);
      } else {
        throw new Error('Gagal menguraikan JSON perubahan dari AI.');
      }
    }

    return res.json({
      success: true,
      assistantReply: parsedResult.assistantReply || 'Dokumen berhasil diperbarui sesuai instruksi Anda.',
      updatedDocument: parsedResult.updatedDocument || currentDocument,
      changes: parsedResult.changes || [],
    });
  } catch (error: any) {
    console.error('Chat Modify Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Terjadi kesalahan saat memproses instruksi perubahan dokumen.',
    });
  }
});

// In development, hook Vite middleware; in production, serve built static assets
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server AI Converter berjalan di port ${PORT} (http://0.0.0.0:${PORT})`);
  });
}

// In local dev or Docker / Cloud Run, start the server.
// In Vercel serverless environment, Vercel invokes the exported app.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
