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

// ==================== EXCEL (.XLSX) EXPORT ====================
export function generateExcelBlob(doc: ExtractedDocument): Blob {
  const wb = XLSX.utils.book_new();

  // If there are key-values, create an "Info Dokumen" summary sheet first
  if (doc.keyValues && doc.keyValues.length > 0) {
    const summaryData: Array<Array<string>> = [
      ['DOKUMEN', doc.documentTitle || 'Hasil Konversi AI'],
      ['TANGGAL KONVERSI', new Date().toLocaleDateString('id-ID')],
      ['RINGKASAN', doc.summary || '-'],
      [''],
      ['PARAMETER / FIELD', 'NILAI / KETERANGAN'],
    ];

    doc.keyValues.forEach((kv) => {
      summaryData.push([kv.key, kv.value]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Dokumen');
  }

  // Create sheets for tables
  if (doc.tables && doc.tables.length > 0) {
    doc.tables.forEach((table, index) => {
      const sheetName = (table.title ? table.title.replace(/[:\\/?*\[\]]/g, '') : `Tabel ${index + 1}`).substring(0, 31);
      
      const sheetRows: Array<Array<any>> = [];

      if (table.title) {
        sheetRows.push([table.title]);
        sheetRows.push(['']);
      }

      // Headers
      sheetRows.push(table.headers);

      // Data Rows with careful data types
      table.rows.forEach((row) => {
        const formattedRow = row.map((cell) => {
          if (!cell) return '';
          const trimmed = cell.trim();
          // If cell starts with '0' and is longer than 1 digit (e.g. phone or code '081234'), keep as text!
          if (trimmed.length > 1 && trimmed.startsWith('0') && /^\d+$/.test(trimmed)) {
            return trimmed;
          }
          // If clean number without currency
          const numCandidate = trimmed.replace(/\./g, '').replace(/,/g, '.');
          if (/^-?\d+(\.\d+)?$/.test(numCandidate) && !trimmed.startsWith('0')) {
            const parsed = parseFloat(numCandidate);
            if (!isNaN(parsed)) return parsed;
          }
          return cell;
        });
        sheetRows.push(formattedRow);
      });

      // Subtotals & Total if present
      if (table.subtotals && table.subtotals.length > 0) {
        table.subtotals.forEach((sub) => {
          const subRow = new Array(Math.max(table.headers.length, 2)).fill('');
          subRow[table.headers.length - 2] = sub.label;
          subRow[table.headers.length - 1] = sub.value;
          sheetRows.push(subRow);
        });
      }

      if (table.total) {
        const totRow = new Array(Math.max(table.headers.length, 2)).fill('');
        totRow[table.headers.length - 2] = 'TOTAL';
        totRow[table.headers.length - 1] = table.total;
        sheetRows.push(totRow);
      }

      const ws = XLSX.utils.aoa_to_sheet(sheetRows);

      // Auto-fit column widths
      const colWidths = table.headers.map((h, colIdx) => {
        let maxLen = (h || '').length;
        table.rows.forEach((r) => {
          if (r[colIdx]) {
            maxLen = Math.max(maxLen, String(r[colIdx]).length);
          }
        });
        return { wch: Math.min(Math.max(maxLen + 4, 12), 40) };
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  } else {
    // If no tables, write paragraphs as a sheet
    const textRows: Array<Array<string>> = [
      ['Judul', doc.documentTitle],
      [''],
      ['Konten Dokumen', ''],
    ];
    doc.paragraphs.forEach((p) => {
      textRows.push([p.type.toUpperCase(), p.content]);
    });
    const wsText = XLSX.utils.aoa_to_sheet(textRows);
    wsText['!cols'] = [{ wch: 18 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsText, 'Teks Dokumen');
  }

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
export async function downloadBlob(
  blob: Blob,
  filename: string,
  mimeType?: string
): Promise<{ success: boolean; method: 'sharesheet' | 'download' }> {
  const actualMimeType = mimeType || blob.type || 'application/octet-stream';
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent || '');

  // In Android PWA (standalone home screen app), opening blob: URLs via <a> tag
  // causes the WebView to navigate to the blob URL, which renders a blank page
  // because mobile browsers cannot preview raw .xlsx or .docx files inline.
  // Using Web Share API hands the file directly to Android OS (Files, Excel, Drive).
  if (isMobile && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: actualMimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: filename,
          text: `Simpan atau buka dokumen ${filename}`,
          files: [file],
        });
        return { success: true, method: 'sharesheet' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled or closed the Android share picker
        return { success: false, method: 'sharesheet' };
      }
      console.warn('Native mobile share failed, trying direct download fallback:', err);
    }
  }

  // Desktop or fallback: use form attachment submission to /api/download
  // This triggers native OS download manager without opening about:blank
  try {
    const reader = new FileReader();
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
        }, 4000);
      } catch (err) {
        console.warn('Form download fallback failed:', err);
      }
    };
    reader.readAsDataURL(blob);

    return { success: true, method: 'download' };
  } catch (downloadErr) {
    console.error('Download error:', downloadErr);
    throw downloadErr;
  }
}

export async function shareFileOrDownload(
  blob: Blob,
  filename: string,
  mimeType: string
): Promise<{ shared: boolean; method: 'sharesheet' | 'download' }> {
  const res = await downloadBlob(blob, filename, mimeType);
  return { shared: res.success, method: res.method };
}
