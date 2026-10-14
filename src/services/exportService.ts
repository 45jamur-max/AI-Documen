import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
  AlignmentType,
  ShadingType,
} from 'docx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExtractedDocument, PdfOptions } from '../types';

// ==================== HELPER TERBILANG RUPIAH INDONESIA ====================
export function angkaKeTerbilang(nilai: number): string {
  const bilangan = Math.abs(Math.floor(nilai));
  if (isNaN(bilangan) || bilangan === 0) return 'Nol Rupiah';

  const kata = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  function konversi(n: number): string {
    if (n < 12) return kata[n];
    if (n < 20) return konversi(n - 10) + ' Belas';
    if (n < 100) return konversi(Math.floor(n / 10)) + ' Puluh ' + konversi(n % 10);
    if (n < 200) return 'Seratus ' + konversi(n - 100);
    if (n < 1000) return konversi(Math.floor(n / 100)) + ' Ratus ' + konversi(n % 100);
    if (n < 2000) return 'Seribu ' + konversi(n - 1000);
    if (n < 1000000) return konversi(Math.floor(n / 1000)) + ' Ribu ' + konversi(n % 1000);
    if (n < 1000000000) return konversi(Math.floor(n / 1000000)) + ' Juta ' + konversi(n % 1000000);
    if (n < 1000000000000) return konversi(Math.floor(n / 1000000000)) + ' Miliar ' + konversi(n % 1000000000);
    return konversi(Math.floor(n / 1000000000000)) + ' Triliun ' + konversi(n % 1000000000000);
  }

  const hasil = konversi(bilangan).replace(/\s+/g, ' ').trim();
  return `${hasil} Rupiah`;
}

// ==================== EXCEL (.XLSX) EXPORT - 1 SHEET SAJA & SIAP PRINT ====================
export function generateExcelBlob(doc: ExtractedDocument): Blob {
  const wb = XLSX.utils.book_new();
  const allRows: Array<Array<any>> = [];

  // Hitung jumlah kolom maksimum yang dibutuhkan seluruh dokumen
  let maxCols = 2;
  if (doc.tables && doc.tables.length > 0) {
    doc.tables.forEach((t) => {
      maxCols = Math.max(maxCols, t.headers?.length || 2);
    });
  }

  // 1. JUDUL DOKUMEN & KOP ATAS (Baris 1 - 2)
  const docTitle = (doc.documentTitle || 'DOKUMEN HASIL KONVERSI').toUpperCase();
  allRows.push([docTitle]);
  allRows.push([
    `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })} | Kategori: ${(doc.documentType || 'Dokumen').toUpperCase()}`,
  ]);
  allRows.push([]); // Baris kosong pemisah

  // 2. BLOK INFORMASI / PARAMETER (Key-Values diletakkan di sheet yang sama)
  if (doc.keyValues && doc.keyValues.length > 0) {
    allRows.push(['INFORMASI DOKUMEN / FAKTUR:']);
    // Susun key-values secara rapi (2 pasang per baris jika kolom mencukupi)
    if (maxCols >= 4 && doc.keyValues.length > 1) {
      for (let i = 0; i < doc.keyValues.length; i += 2) {
        const kv1 = doc.keyValues[i];
        const kv2 = doc.keyValues[i + 1];
        const rowData = [kv1.key + ':', kv1.value];
        if (kv2) {
          rowData.push(kv2.key + ':');
          rowData.push(kv2.value);
        }
        allRows.push(rowData);
      }
    } else {
      doc.keyValues.forEach((kv) => {
        allRows.push([kv.key + ':', kv.value]);
      });
    }

    // Masukkan info QR Code / Barcode (misal e-Faktur Pajak atau No. Resi)
    if (doc.qrBarcodes && doc.qrBarcodes.length > 0) {
      doc.qrBarcodes.forEach((qb) => {
        allRows.push([`${(qb.label || 'QR / BARCODE').toUpperCase()}:`, qb.rawText]);
      });
    }

    allRows.push([]); // Baris kosong pemisah
  }

  // 3. TABEL DATA UTAMA & TABEL LAINNYA (Semua di 1 Sheet)
  if (doc.tables && doc.tables.length > 0) {
    doc.tables.forEach((table, tableIdx) => {
      // Judul Tabel jika ada lebih dari 1 tabel
      if (table.title) {
        allRows.push([table.title.toUpperCase()]);
      } else if (doc.tables.length > 1) {
        allRows.push([`TABEL RINCIAN #${tableIdx + 1}`]);
      }

      // Baris Header Tabel
      const headers = table.headers.map((h) => (h || '').trim());
      allRows.push(headers);

      // Baris Data dengan konversi angka dan teks yang cermat
      table.rows.forEach((row) => {
        const formattedRow = row.map((cell) => {
          if (!cell) return '';
          const trimmed = String(cell).trim();
          // Jika diawali angka '0' dan lebih dari 1 digit (cth: nomor telepon atau kode barcode), simpan sebagai teks
          if (trimmed.length > 1 && trimmed.startsWith('0') && /^\d+$/.test(trimmed)) {
            return trimmed;
          }
          // Konversi angka murni atau mata uang ke tipe number Excel agar siap dihitung
          const cleanNum = trimmed.replace(/\./g, '').replace(/,/g, '.');
          if (/^-?\d+(\.\d+)?$/.test(cleanNum) && !trimmed.startsWith('0')) {
            const parsed = parseFloat(cleanNum);
            if (!isNaN(parsed)) return parsed;
          }
          return cell;
        });
        allRows.push(formattedRow);
      });

      // Subtotals (Subtotal, Diskon, PPN, dll)
      if (table.subtotals && table.subtotals.length > 0) {
        table.subtotals.forEach((sub) => {
          const subRow = new Array(Math.max(headers.length, 2)).fill('');
          subRow[headers.length - 2] = sub.label;
          const valClean = String(sub.value).trim().replace(/\./g, '').replace(/,/g, '.');
          if (/^-?\d+(\.\d+)?$/.test(valClean)) {
            subRow[headers.length - 1] = parseFloat(valClean);
          } else {
            subRow[headers.length - 1] = sub.value;
          }
          allRows.push(subRow);
        });
      }

      // Baris Total Akhir
      if (table.total) {
        const totRow = new Array(Math.max(headers.length, 2)).fill('');
        totRow[headers.length - 2] = 'TOTAL';
        const totClean = String(table.total).trim().replace(/\./g, '').replace(/,/g, '.');
        let parsedTotal: number | null = null;
        if (/^-?\d+(\.\d+)?$/.test(totClean)) {
          parsedTotal = parseFloat(totClean);
          totRow[headers.length - 1] = parsedTotal;
        } else {
          totRow[headers.length - 1] = table.total;
        }
        allRows.push(totRow);

        // Tambahkan baris Terbilang resmi otomatis jika total berupa angka
        if (parsedTotal && parsedTotal > 0) {
          const terbilangStr = angkaKeTerbilang(parsedTotal);
          const terbilangRow = new Array(Math.max(headers.length, 2)).fill('');
          terbilangRow[0] = 'TERBILANG:';
          terbilangRow[1] = `# ${terbilangStr} #`;
          allRows.push(terbilangRow);
        }
      }

      allRows.push([]); // Baris kosong pemisah antar tabel
    });
  } else {
    // Jika tidak ada tabel, tulis isi teks/paragraf
    if (doc.paragraphs && doc.paragraphs.length > 0) {
      allRows.push(['ISI DOKUMEN:']);
      doc.paragraphs.forEach((p) => {
        allRows.push([p.content]);
      });
      allRows.push([]);
    }
  }

  // 4. CATATAN & RINGKASAN
  if (doc.summary) {
    allRows.push(['CATATAN / RINGKASAN:']);
    allRows.push([doc.summary]);
    allRows.push([]);
  }

  // 5. BAGIAN TANDA TANGAN RESMI (SIAP PRINT A4)
  allRows.push([]);
  const sign1 = new Array(maxCols).fill('');
  const sign2 = new Array(maxCols).fill('');
  const sign3 = new Array(maxCols).fill('');
  const sign4 = new Array(maxCols).fill('');

  const leftCol = 0;
  const rightCol = Math.max(maxCols - 1, 1);

  sign1[leftCol] = 'Diterima Oleh,';
  sign1[rightCol] = 'Hormat Kami,';

  sign4[leftCol] = '( _____________________ )';
  sign4[rightCol] = '( _____________________ )';

  allRows.push(sign1);
  allRows.push(sign2);
  allRows.push(sign3);
  allRows.push(sign4);

  // Buat 1 Sheet Tunggal
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Hitung lebar kolom otomatis agar pas dan tidak terpotong saat dicetak
  const colWidths: Array<{ wch: number }> = [];
  for (let c = 0; c < maxCols; c++) {
    let maxLen = 12;
    allRows.forEach((row) => {
      if (row[c] !== undefined && row[c] !== null) {
        const valStr = String(row[c]);
        // Jangan biarkan judul panjang mempengaruhi lebar satu kolom
        if (row.length > 1 || valStr.length < 40) {
          maxLen = Math.max(maxLen, valStr.length);
        }
      }
    });
    // Batas lebar nyaman untuk cetak kertas A4 (min 12, max 35 karakter)
    colWidths.push({ wch: Math.min(Math.max(maxLen + 3, 12), 35) });
  }
  ws['!cols'] = colWidths;

  // Konfigurasi Siap Cetak (A4, margin 0.5 inci, fit 1 halaman lebar)
  ws['!margins'] = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
  ws['!pageSetup'] = {
    paperSize: 9, // Kertas A4
    orientation: maxCols > 6 ? 'landscape' : 'portrait',
    fitToWidth: 1,
    fitToHeight: 0,
  };

  // Masukkan HANYA 1 SHEET tunggal ke dalam workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Dokumen');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ==================== WORD (.DOCX) EXPORT ====================
export async function generateWordBlob(doc: ExtractedDocument): Promise<Blob> {
  const sectionsChildren: any[] = [];

  // Title
  sectionsChildren.push(
    new Paragraph({
      text: doc.documentTitle || 'Dokumen Konversi AI',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Subtitle / Date
  sectionsChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Dihasilkan oleh AI Converter • ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`,
          italics: true,
          color: '64748B',
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Summary box
  if (doc.summary) {
    sectionsChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Ringkasan Dokumen: ', bold: true, color: '1E3A8A' }),
          new TextRun({ text: doc.summary }),
        ],
        spacing: { after: 250 },
      })
    );
  }

  // Key-Values Section
  if (doc.keyValues && doc.keyValues.length > 0) {
    sectionsChildren.push(
      new Paragraph({
        text: 'Informasi Kunci & Data Identitas',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 150 },
      })
    );

    const kvRows = doc.keyValues.map(
      (kv) =>
        new DocxTableRow({
          children: [
            new DocxTableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: kv.key, bold: true })],
                }),
              ],
              shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            }),
            new DocxTableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: kv.value })],
                }),
              ],
            }),
          ],
        })
    );

    sectionsChildren.push(
      new DocxTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: kvRows,
      })
    );
    sectionsChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Tables Section
  if (doc.tables && doc.tables.length > 0) {
    doc.tables.forEach((table, tableIdx) => {
      sectionsChildren.push(
        new Paragraph({
          text: table.title || `Tabel ${tableIdx + 1}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 250, after: 150 },
        })
      );

      // Header row
      const colWidthPercent = Math.floor(100 / Math.max(table.headers.length, 1));
      const headerRow = new DocxTableRow({
        tableHeader: true,
        children: table.headers.map(
          (header) =>
            new DocxTableCell({
              width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: header, bold: true, color: 'FFFFFF' })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { type: ShadingType.CLEAR, fill: '1E40AF' },
            })
        ),
      });

      // Data rows
      const dataRows = table.rows.map(
        (row, rIdx) =>
          new DocxTableRow({
            children: row.map(
              (cell) =>
                new DocxTableCell({
                  width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: cell || '-' })],
                    }),
                  ],
                  shading: {
                    type: ShadingType.CLEAR,
                    fill: rIdx % 2 === 1 ? 'F1F5F9' : 'FFFFFF',
                  },
                })
            ),
          })
      );

      sectionsChildren.push(
        new DocxTable({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
        })
      );

      if (table.total) {
        sectionsChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Total Keseluruhan: ', bold: true }),
              new TextRun({ text: table.total, bold: true, color: '15803D' }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 100, after: 200 },
          })
        );
      }
    });
  }

  // Paragraphs Section
  if (doc.paragraphs && doc.paragraphs.length > 0) {
    sectionsChildren.push(
      new Paragraph({
        text: 'Isi Dokumen & Catatan',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 250, after: 150 },
      })
    );

    doc.paragraphs.forEach((p) => {
      let heading: any = undefined;
      let bold = false;
      let bullet: any = undefined;

      if (p.type === 'heading1') {
        heading = HeadingLevel.HEADING_1;
      } else if (p.type === 'heading2') {
        heading = HeadingLevel.HEADING_2;
      } else if (p.type === 'bullet') {
        bullet = { level: 0 };
      }

      sectionsChildren.push(
        new Paragraph({
          text: p.content,
          heading,
          bullet,
          spacing: { after: 120 },
        })
      );
    });
  }

  const docxDoc = new Document({
    sections: [
      {
        properties: {},
        children: sectionsChildren,
      },
    ],
  });

  return await Packer.toBlob(docxDoc);
}

// ==================== PDF (.PDF) EXPORT ====================
export function generatePdfBlob(doc: ExtractedDocument, options: PdfOptions = { pageSize: 'a4', orientation: 'portrait', includeImages: false }): Blob {
  const pdf = new jsPDF({
    format: options.pageSize,
    orientation: options.orientation,
    unit: 'mm',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  let currentY = 18;

  // Title Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(30, 58, 138); // Blue
  const titleText = doc.documentTitle || 'Dokumen Konversi AI';
  pdf.text(titleText, 14, currentY);
  currentY += 8;

  // Subtitle / Date
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Dihasilkan oleh AI Converter • ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, 14, currentY);
  currentY += 8;

  // Horizontal divider
  pdf.setDrawColor(203, 213, 225);
  pdf.line(14, currentY, pageWidth - 14, currentY);
  currentY += 8;

  // Summary
  if (doc.summary) {
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(30, 41, 59);
    pdf.text('Ringkasan: ', 18, currentY + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(51, 65, 85);
    const summaryLines = pdf.splitTextToSize(doc.summary, pageWidth - 60);
    pdf.text(summaryLines, 42, currentY + 6);
    currentY += 18;
  }

  // Key-Values table
  if (doc.keyValues && doc.keyValues.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(30, 58, 138);
    pdf.text('Informasi Dokumen', 14, currentY);
    currentY += 4;

    const kvBody = doc.keyValues.map((kv) => [kv.key, kv.value]);

    autoTable(pdf, {
      startY: currentY,
      head: [['Field / Keterangan', 'Nilai']],
      body: kvBody,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.5 },
      margin: { left: 14, right: 14 },
    });

    currentY = (pdf as any).lastAutoTable.finalY + 10;
  }

  // Tables
  if (doc.tables && doc.tables.length > 0) {
    doc.tables.forEach((table, tIdx) => {
      // Check if page overflow
      if (currentY > pdf.internal.pageSize.getHeight() - 40) {
        pdf.addPage();
        currentY = 18;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 58, 138);
      pdf.text(table.title || `Tabel ${tIdx + 1}`, 14, currentY);
      currentY += 4;

      autoTable(pdf, {
        startY: currentY,
        head: [table.headers],
        body: table.rows,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      });

      currentY = (pdf as any).lastAutoTable.finalY + 4;

      if (table.total) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(21, 128, 61);
        pdf.text(`Total: ${table.total}`, pageWidth - 14, currentY + 4, { align: 'right' });
        currentY += 12;
      } else {
        currentY += 8;
      }
    });
  }

  // Paragraphs
  if (doc.paragraphs && doc.paragraphs.length > 0) {
    if (currentY > pdf.internal.pageSize.getHeight() - 30) {
      pdf.addPage();
      currentY = 18;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(30, 58, 138);
    pdf.text('Teks & Catatan Dokumen', 14, currentY);
    currentY += 6;

    doc.paragraphs.forEach((p) => {
      if (currentY > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        currentY = 18;
      }

      if (p.type === 'heading1' || p.type === 'heading2') {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text(p.content, 14, currentY);
        currentY += 6;
      } else if (p.type === 'bullet') {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(51, 65, 85);
        const bulletLines = pdf.splitTextToSize(`• ${p.content}`, pageWidth - 28);
        pdf.text(bulletLines, 14, currentY);
        currentY += bulletLines.length * 4.5;
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(51, 65, 85);
        const pLines = pdf.splitTextToSize(p.content, pageWidth - 28);
        pdf.text(pLines, 14, currentY);
        currentY += pLines.length * 4.5 + 2;
      }
    });
  }

  // Add Page Numbers footer to all pages
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `Halaman ${i} dari ${totalPages} • AI Converter Android`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  return pdf.output('blob');
}

// ==================== DOWNLOAD & SHARESHEET UTILITIES ====================
// Fungsi unduh langsung (TIDAK membuka menu share / bagikan, langsung simpan file)
export async function downloadBlob(
  blob: Blob,
  filename: string,
  mimeType?: string
): Promise<{ success: boolean; method: 'download' }> {
  const actualMimeType = mimeType || blob.type || 'application/octet-stream';

  // 1. Coba unduh via endpoint streaming attachment server (/api/download)
  // Metode ini langsung ditangkap oleh Download Manager Android ke folder Download tanpa about:blank
  try {
    const reader = new FileReader();
    const downloadPromise = new Promise<{ success: boolean; method: 'download' }>((resolve) => {
      reader.onload = () => {
        try {
          const dataUrl = (reader.result as string) || '';
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = '/api/download';
          form.style.display = 'none';

          const inputData = document.createElement('input');
          inputData.type = 'hidden';
          inputData.name = 'fileBase64';
          inputData.value = dataUrl;
          form.appendChild(inputData);

          const inputFilename = document.createElement('input');
          inputFilename.type = 'hidden';
          inputFilename.name = 'filename';
          inputFilename.value = filename;
          form.appendChild(inputFilename);

          const inputMime = document.createElement('input');
          inputMime.type = 'hidden';
          inputMime.name = 'mimeType';
          inputMime.value = actualMimeType;
          form.appendChild(inputMime);

          document.body.appendChild(form);
          form.submit();
          setTimeout(() => {
            try {
              if (form.parentNode) {
                form.parentNode.removeChild(form);
              }
            } catch {}
            resolve({ success: true, method: 'download' });
          }, 1500);
        } catch {
          // Fallback ke anchor
          triggerAnchorDownload(blob, filename);
          resolve({ success: true, method: 'download' });
        }
      };

      reader.onerror = () => {
        triggerAnchorDownload(blob, filename);
        resolve({ success: true, method: 'download' });
      };

      reader.readAsDataURL(blob);
    });

    return await downloadPromise;
  } catch (err) {
    console.warn('Form attachment download error, falling back to anchor:', err);
    triggerAnchorDownload(blob, filename);
    return { success: true, method: 'download' };
  }
}

// Helper anchor download
function triggerAnchorDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  anchor.target = '_self';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    try {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
      URL.revokeObjectURL(url);
    } catch {}
  }, 45000);
}

// Fungsi khusus tombol "Bagikan File" (membuka menu share Android / WhatsApp / Drive)
export async function shareFileOrDownload(
  blob: Blob,
  filename: string,
  mimeType: string
): Promise<{ shared: boolean; method: 'sharesheet' | 'download' }> {
  const actualMimeType = mimeType || blob.type || 'application/octet-stream';

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: actualMimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: filename,
          text: `Dokumen ${filename} dari AI Converter`,
          files: [file],
        });
        return { shared: true, method: 'sharesheet' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'sharesheet' };
      }
      console.warn('Share picker failed, falling back to download:', err);
    }
  }

  // Fallback ke unduh langsung jika device tidak support Web Share API
  const res = await downloadBlob(blob, filename, actualMimeType);
  return { shared: res.success, method: 'download' };
}
