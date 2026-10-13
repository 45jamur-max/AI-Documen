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
        error: 'Kunci API Gemini (GEMINI_API_KEY) belum terbaca di Environment Variables Vercel.',
      });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // Fallback
      }
    }

    const { currentDocument, userPrompt, chatHistory = [] } = body || {};

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

    return res.status(200).json({
      success: true,
      assistantReply: parsedResult.assistantReply || 'Dokumen berhasil diperbarui sesuai instruksi Anda.',
      updatedDocument: parsedResult.updatedDocument || currentDocument,
      changes: parsedResult.changes || [],
    });
  } catch (error: any) {
    console.error('Vercel Chat Modify Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Terjadi kesalahan saat memproses instruksi perubahan dokumen.',
    });
  }
}
