import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // Set CORS headers
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
        error: 'Kunci API Gemini (GEMINI_API_KEY) belum terbaca di Vercel Environment Variables.',
      });
    }

    // Support pre-parsed body, Buffer, and raw string body on Vercel
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch {
        // Fallback
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // Fallback
      }
    }

    const { images, targetFormat = 'excel', preserveLayout = true } = body || {};

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tidak ada gambar yang diunggah. Silakan pilih minimal 1 foto dokumen.',
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

    const parts: any[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.data) continue;

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
          data: base64Clean.trim(),
          mimeType,
        },
      });
    }

    if (parts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Data gambar tidak valid atau kosong.',
      });
    }

    const promptText = `
Anda adalah sistem Optical Character Recognition (OCR) dan Document Layout Analysis cerdas.
Tugas Anda adalah membaca dan mengekstrak semua isi teks, tabel baris-kolom, daftar harga/barang, nomor nota/faktur, dan data kunci dari ${parts.length} gambar dokumen yang disertakan.

Instruksi Format Target: "${targetFormat}"
Pertahankan Tata Letak: ${preserveLayout ? 'Ya (Preserve tabular structure)' : 'Tidak (Free flowing)'}

Aturan Ketat:
1. Ekstraksi tabel secara presisi: Kolom ("headers") dan baris ("rows").
2. Jangan pernah menghilangkan angka nol di depan (misal: "00123" jangan jadi "123").
3. Format angka atau uang ditulis utuh (misal: "15.000" atau "Rp 15.000").
4. DETEKSI QR CODE & BARCODE:
   - Jika pada gambar terdapat QR Code (seperti QR e-Faktur Pajak DJP, QRIS, tautan verifikasi) atau Barcode 1D (nomor resi kurir, barcode produk), baca isinya dan masukkan ke array "qrBarcodes".
   - Jika tidak ditemukan QR atau Barcode, berikan array kosong [].

5. Kembalikan HANYA format JSON murni tanpa pembuka/penutup markdown dengan struktur berikut:
{
  "documentTitle": "string",
  "documentType": "table | receipt | document | invoice | mixed",
  "summary": "string",
  "confidenceScore": 95,
  "detectedLanguage": "Bahasa Indonesia",
  "tables": [
    {
      "title": "string",
      "headers": ["string"],
      "rows": [["string"]],
      "subtotals": [{"label": "string", "value": "string"}],
      "total": "string"
    }
  ],
  "keyValues": [
    {
      "key": "string",
      "value": "string",
      "isFinancialOrCode": true,
      "needsReview": false,
      "reviewNote": ""
    }
  ],
  "paragraphs": [
    {
      "type": "heading | paragraph | footnote",
      "content": "string",
      "needsReview": false
    }
  ],
  "uncertainties": [
    {
      "location": "string",
      "observedText": "string",
      "issue": "string"
    }
  ],
  "qrBarcodes": [
    {
      "type": "qr_code | barcode | e_faktur | resi | other",
      "rawText": "string",
      "label": "string",
      "isUrl": true
    }
  ]
}
`;

    parts.push({ text: promptText });

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    let lastError: any = null;
    let textOutput = '';

    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const configPayload: any = {
            responseMimeType: 'application/json',
          };

          if (modelName.includes('flash')) {
            configPayload.thinkingConfig = { thinkingLevel: 'MINIMAL' };
          }

          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: configPayload,
          });

          textOutput = response.text?.trim() || '';
          if (textOutput) break;
        } catch (err: any) {
          lastError = err;
          const isTransient = err?.status === 503 || err?.status === 429 || String(err?.message || '').includes('503');
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
        error: 'Layanan AI sedang sibuk sementara. Silakan coba tekan tombol konversi sekali lagi.',
      });
    }

    let cleanJson = textOutput;
    if (cleanJson.includes('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanJson);
    } catch {
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error('Gagal menguraikan JSON hasil ekstraksi.');
      }
    }

    return res.status(200).json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Vercel OCR Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Terjadi kesalahan saat memproses gambar di server.',
    });
  }
}
