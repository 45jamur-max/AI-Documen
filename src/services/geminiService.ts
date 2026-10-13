import { ExtractedDocument, ImageItem, TargetFormat } from '../types';

export interface ConvertOptions {
  images: ImageItem[];
  targetFormat: TargetFormat;
  preserveLayout: boolean;
}

export async function processImagesWithAI(options: ConvertOptions): Promise<ExtractedDocument> {
  const { images, targetFormat, preserveLayout } = options;

  if (!navigator.onLine) {
    throw new Error('Koneksi internet terputus. Pastikan perangkat Anda terhubung ke internet untuk memproses OCR dengan AI.');
  }

  if (images.length === 0) {
    throw new Error('Silakan pilih minimal 1 foto atau screenshot dokumen terlebih dahulu.');
  }

  const payloadImages = images.map((img) => ({
    name: img.name,
    mimeType: img.mimeType,
    data: img.dataUrl,
  }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for complex documents

    const response = await fetch('/api/convert-ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: payloadImages,
        targetFormat,
        preserveLayout,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = 'Gagal memproses dokumen.';
      try {
        const errorData = await response.json();
        if (errorData?.error) {
          const rawErr = errorData.error;
          if (typeof rawErr === 'string') {
            try {
              const nested = JSON.parse(rawErr);
              if (nested?.error?.message) {
                errorMsg = nested.error.message;
              } else {
                errorMsg = rawErr;
              }
            } catch {
              errorMsg = rawErr;
            }
          } else if (rawErr?.message) {
            errorMsg = rawErr.message;
          }
        }
      } catch {
        errorMsg = `Server mengembalikan status ${response.status} (${response.statusText})`;
      }

      if (errorMsg.includes('503') || errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE')) {
        errorMsg = 'Layanan AI sedang mengalami lonjakan antrean sementara. Silakan ketuk tombol coba lagi.';
      }

      throw new Error(errorMsg);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Respon dari AI tidak valid.');
    }

    const doc: ExtractedDocument = {
      documentTitle: result.data.documentTitle || 'Dokumen Konversi',
      documentType: result.data.documentType || 'mixed',
      summary: result.data.summary || '',
      confidenceScore: typeof result.data.confidenceScore === 'number' ? result.data.confidenceScore : 90,
      detectedLanguage: result.data.detectedLanguage || 'Bahasa Indonesia',
      tables: Array.isArray(result.data.tables) ? result.data.tables : [],
      keyValues: Array.isArray(result.data.keyValues) ? result.data.keyValues : [],
      paragraphs: Array.isArray(result.data.paragraphs) ? result.data.paragraphs : [],
      uncertainties: Array.isArray(result.data.uncertainties) ? result.data.uncertainties : [],
    };

    return doc;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Waktu permintaan habis (timeout). Dokumen mungkin terlalu besar atau koneksi lambat. Silakan coba lagi.');
    }
    throw error;
  }
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  changes?: string[];
}

export async function modifyDocumentWithChat(
  currentDocument: ExtractedDocument,
  userPrompt: string,
  chatHistory: Array<{ role: 'user' | 'model'; text: string }> = []
): Promise<{ assistantReply: string; updatedDocument: ExtractedDocument; changes: string[] }> {
  const response = await fetch('/api/chat-modify-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentDocument,
      userPrompt,
      chatHistory,
    }),
  });

  if (!response.ok) {
    let errorMsg = 'Gagal memproses instruksi perubahan dokumen.';
    try {
      const errData = await response.json();
      if (errData?.error) errorMsg = errData.error;
    } catch {
      errorMsg = `Server mengembalikan status ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();
  if (!result.success || !result.updatedDocument) {
    throw new Error(result.error || 'Respon dari AI tidak valid.');
  }

  return {
    assistantReply: result.assistantReply,
    updatedDocument: result.updatedDocument,
    changes: result.changes || [],
  };
}
