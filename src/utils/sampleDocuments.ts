import { ImageItem } from '../types';

/**
 * Creates high-contrast document images rendered directly via HTML5 Canvas.
 * This guarantees instant testability without external network image dependencies.
 */
export function generateSampleInvoiceImage(): ImageItem {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // White paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle paper texture border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 860, 1160);

  // Header Title
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('FAKTUR PENJUALAN', 50, 90);

  ctx.fillStyle = '#475569';
  ctx.font = '20px sans-serif';
  ctx.fillText('PT NUSANTARA JAYA ABADI', 50, 130);
  ctx.fillText('Jl. Merdeka No. 45, Jakarta Pusat', 50, 160);
  ctx.fillText('NPWP: 01.345.678.9-012.000', 50, 190);

  // Invoice metadata
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('No. Faktur: INV-2024-8841', 520, 90);
  ctx.font = '18px sans-serif';
  ctx.fillText('Tanggal: 14 Oktober 2024', 520, 130);
  ctx.fillText('Jatuh Tempo: 28 Oktober 2024', 520, 160);
  ctx.fillText('Pelanggan: CV Sumber Rejeki', 520, 190);

  // Divider line
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 220);
  ctx.lineTo(850, 220);
  ctx.stroke();

  // Table Header
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(50, 250, 800, 45);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('NO', 70, 280);
  ctx.fillText('NAMA BARANG / DESKRIPSI', 130, 280);
  ctx.fillText('QTY', 470, 280);
  ctx.fillText('HARGA SATUAN', 550, 280);
  ctx.fillText('TOTAL (IDR)', 720, 280);

  // Table Rows Data
  const rows = [
    { no: '1', name: 'Kertas HVS PaperOne A4 80gr', qty: '10 Rim', price: '58.000', total: '580.000' },
    { no: '2', name: 'Tinta Printer Epson 003 Black', qty: '4 Btl', price: '95.000', total: '380.000' },
    { no: '3', name: 'Binder Clip Joyko No. 155', qty: '5 Box', price: '18.500', total: '92.500' },
    { no: '4', name: 'Ballpoint Pilot G2 0.5mm Hitam', qty: '2 Lusin', price: '144.000', total: '288.000' },
    { no: '5', name: 'Buku Catatan Hardcover A5', qty: '6 Pcs', price: '35.000', total: '210.000' },
  ];

  let y = 330;
  ctx.font = '17px sans-serif';

  rows.forEach((r, idx) => {
    // Alternate row shading
    if (idx % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(50, y - 25, 800, 40);
    }

    ctx.fillStyle = '#334155';
    ctx.fillText(r.no, 75, y);
    ctx.fillText(r.name, 130, y);
    ctx.fillText(r.qty, 470, y);
    ctx.fillText(r.price, 560, y);
    ctx.fillText(r.total, 725, y);

    // subtle line
    ctx.strokeStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(50, y + 15);
    ctx.lineTo(850, y + 15);
    ctx.stroke();

    y += 45;
  });

  // Table summary
  y += 20;
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(450, y);
  ctx.lineTo(850, y);
  ctx.stroke();

  y += 35;
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Subtotal:', 550, y);
  ctx.fillText('Rp 1.550.500', 710, y);

  y += 30;
  ctx.font = '17px sans-serif';
  ctx.fillText('PPN (11%):', 550, y);
  ctx.fillText('Rp 170.555', 720, y);

  y += 35;
  ctx.fillStyle = '#15803d';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('TOTAL AKHIR:', 510, y);
  ctx.fillText('Rp 1.721.055', 700, y);

  // Footer notes & signature
  y = 850;
  ctx.fillStyle = '#64748b';
  ctx.font = '15px sans-serif';
  ctx.fillText('Catatan: Pembayaran ditransfer ke Rek. BCA 123-456-7890 a/n PT Nusantara Jaya Abadi', 50, y);
  ctx.fillText('Barang yang sudah dibeli tidak dapat dikembalikan tanpa nota.', 50, y + 25);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Hormat Kami,', 650, y + 50);
  ctx.fillText('( Bagian Keuangan )', 630, y + 150);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

  return {
    id: 'sample_inv_' + Date.now(),
    name: 'Faktur_Pembelian_Sample.jpg',
    size: Math.round(dataUrl.length * 0.75),
    mimeType: 'image/jpeg',
    dataUrl,
    previewUrl: dataUrl,
  };
}
