export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // Fallback
      }
    }

    const { fileBase64, filename = 'dokumen.xlsx', mimeType = 'application/octet-stream' } = body || {};

    if (!fileBase64) {
      return res.status(400).send('Data file tidak ditemukan.');
    }

    let rawBase64 = fileBase64;
    if (rawBase64.includes('base64,')) {
      rawBase64 = rawBase64.split('base64,')[1];
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);

    // Set attachment headers so Android Download Manager saves the file directly
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(200).end(buffer);
  } catch (err: any) {
    console.error('Download endpoint error:', err);
    return res.status(500).send('Gagal mengunduh file: ' + (err?.message || 'Error'));
  }
}
