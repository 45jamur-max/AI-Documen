import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Kunci API Gemini (GEMINI_API_KEY) belum dikonfigurasi di Environment Variables.',
      });
    }

    let body = req.body;
    if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch {}
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { currentDocument, targetLanguage = 'id' } = body || {};

    if (!currentDocument) {
      return res.status(400).json({
        success: false,
        error: 'Data dokumen wajib disertakan.',
      });
    }

    const languageNames: Record<string, string> = {
      id: 'Bahasa Indonesia',
      en: 'English (Bahasa Inggris)',
      zh: 'Mandarin (Chinese 中文)',
      ja: 'Japanese (Bahasa Jepang 日本語)',
      ar: 'Arabic (Bahasa Arab العربية)',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemPrompt = `
Anda adalah Ahli Penerjemah Dokumen Finansial, Faktur, dan Dokumen Bisnis Multibahasa.
Tugas Anda adalah menerjemahkan teks di dalam dokumen JSON ini ke bahasa target: "${targetLangName}".

ATURAN PENERJEMAHAN KETAT:
1. Terjemahkan teks linguistik secara natural dan akurat:
   - "documentTitle" (Judul Dokumen)
   - "summary" (Ringkasan)
   - Tabel "headers" (Nama-nama kolom tabel)
   - Isi teks/deskripsi nama barang pada setiap baris di tabel "rows"
   - Label pada "subtotals" (misal: "Tax" -> "Pajak", "Discount" -> "Diskon")
   - Nama atribut "key" pada array "keyValues"
   - Isi teks pada "paragraphs"
   - Perbarui "detectedLanguage" menjadi "${targetLangName}"
2. JANGAN MENGUBAH ANGKA SAMA SEKALI:
   - Angka nominal harga, kuantitas (qty), total, subtotal, nomor faktur, tanggal, barcode, dan kode unik WAJIB TETAP PERSIS SAMA.
   - Jangan mengubah struktur baris dan kolom tabel. Jumlah baris dan kolom harus sama persis.
3. Kembalikan HANYA format JSON murni tanpa pembuka/penutup markdown dengan struktur ExtractedDocument yang lengkap:
{
  "documentTitle": "string",
  "documentType": "string",
  "summary": "string",
  "confidenceScore": 98,
  "detectedLanguage": "${targetLangName}",
  "tables": [...],
  "keyValues": [...],
  "paragraphs": [...],
  "uncertainties": [],
  "qrBarcodes": [...]
}
`;

    const promptText = `
Dokumen yang perlu diterjemahkan ke ${targetLangName}:
${JSON.stringify(currentDocument, null, 2)}

Silakan kembalikan seluruh dokumen dalam JSON yang sudah diterjemahkan ke ${targetLangName}.`;

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

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
          const isTransient = err?.status === 503 || err?.status === 429;
          if (isTransient && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1200));
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
        error: 'Layanan AI sedang sibuk sementara saat menerjemahkan.',
      });
    }

    let cleanJson = textOutput;
    if (cleanJson.includes('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    const translatedDocument = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      translatedDocument,
      targetLanguage: targetLangName,
    });
  } catch (error: any) {
    console.error('Translation error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Terjadi kesalahan saat menerjemahkan dokumen.',
    });
  }
}
