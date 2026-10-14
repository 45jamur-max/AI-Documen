import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  FileCode2,
  Share2,
  Download,
  AlertTriangle,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle,
  Edit2,
  Sparkles,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { ExtractedDocument, TargetFormat, TableData, KeyValueItem, ParagraphItem } from '../types';
import { generateExcelBlob, generateWordBlob, generatePdfBlob, shareFileOrDownload, downloadBlob } from '../services/exportService';
import { DocumentChatSheet } from './DocumentChatSheet';

interface ResultEditorProps {
  document: ExtractedDocument;
  initialFormat: TargetFormat;
  onReset: () => void;
  onSaveToHistory?: (format: TargetFormat) => void;
}

export const ResultEditor: React.FC<ResultEditorProps> = ({
  document: initialDoc,
  initialFormat,
  onReset,
  onSaveToHistory,
}) => {
  const [doc, setDoc] = useState<ExtractedDocument>(initialDoc);
  const [activeFormat, setActiveFormat] = useState<TargetFormat>(initialFormat);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Synchronize state whenever a new document is loaded
  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Title modification
  const handleTitleChange = (newTitle: string) => {
    setDoc({ ...doc, documentTitle: newTitle });
  };

  // Table cell editing
  const handleCellChange = (tableIdx: number, rowIdx: number, colIdx: number, val: string) => {
    const updatedTables = [...doc.tables];
    const targetTable = { ...updatedTables[tableIdx] };
    const updatedRows = targetTable.rows.map((r, rI) => {
      if (rI !== rowIdx) return r;
      const newRow = [...r];
      newRow[colIdx] = val;
      return newRow;
    });
    targetTable.rows = updatedRows;
    updatedTables[tableIdx] = targetTable;
    setDoc({ ...doc, tables: updatedTables });
  };

  // Table header editing
  const handleHeaderChange = (tableIdx: number, colIdx: number, val: string) => {
    const updatedTables = [...doc.tables];
    const targetTable = { ...updatedTables[tableIdx] };
    const updatedHeaders = [...targetTable.headers];
    updatedHeaders[colIdx] = val;
    targetTable.headers = updatedHeaders;
    updatedTables[tableIdx] = targetTable;
    setDoc({ ...doc, tables: updatedTables });
  };

  // Add row to table
  const handleAddRow = (tableIdx: number) => {
    const updatedTables = [...doc.tables];
    const targetTable = { ...updatedTables[tableIdx] };
    const emptyRow = new Array(targetTable.headers.length).fill('');
    targetTable.rows = [...targetTable.rows, emptyRow];
    updatedTables[tableIdx] = targetTable;
    setDoc({ ...doc, tables: updatedTables });
  };

  // Remove row from table
  const handleRemoveRow = (tableIdx: number, rowIdx: number) => {
    const updatedTables = [...doc.tables];
    const targetTable = { ...updatedTables[tableIdx] };
    targetTable.rows = targetTable.rows.filter((_, i) => i !== rowIdx);
    updatedTables[tableIdx] = targetTable;
    setDoc({ ...doc, tables: updatedTables });
  };

  // Key-value editing
  const handleKeyValueChange = (idx: number, field: 'key' | 'value', val: string) => {
    const updatedKVs = [...doc.keyValues];
    updatedKVs[idx] = { ...updatedKVs[idx], [field]: val };
    setDoc({ ...doc, keyValues: updatedKVs });
  };

  const handleAddKeyValue = () => {
    const newKV: KeyValueItem = { key: 'Keterangan Baru', value: '' };
    setDoc({ ...doc, keyValues: [...doc.keyValues, newKV] });
  };

  const handleRemoveKeyValue = (idx: number) => {
    setDoc({ ...doc, keyValues: doc.keyValues.filter((_, i) => i !== idx) });
  };

  // Paragraph editing
  const handleParagraphChange = (idx: number, val: string) => {
    const updatedP = [...doc.paragraphs];
    updatedP[idx] = { ...updatedP[idx], content: val };
    setDoc({ ...doc, paragraphs: updatedP });
  };

  // Generate blob based on format
  const getBlobForFormat = async (format: TargetFormat): Promise<{ blob: Blob; filename: string; mimeType: string }> => {
    const cleanTitle = (doc.documentTitle || 'Dokumen_Konversi')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 40);

    if (format === 'excel') {
      const blob = generateExcelBlob(doc);
      return {
        blob,
        filename: `${cleanTitle}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    } else if (format === 'word') {
      const blob = await generateWordBlob(doc);
      return {
        blob,
        filename: `${cleanTitle}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    } else {
      const blob = generatePdfBlob(doc);
      return {
        blob,
        filename: `${cleanTitle}.pdf`,
        mimeType: 'application/pdf',
      };
    }
  };

  // Export & Download Langsung (Direct Download ke Penyimpanan Perangkat)
  const handleDownload = async (formatToExport: TargetFormat = activeFormat) => {
    setIsExporting(true);
    try {
      const { blob, filename, mimeType } = await getBlobForFormat(formatToExport);
      await downloadBlob(blob, filename, mimeType);
      onSaveToHistory?.(formatToExport);
      showToast(`Mengunduh ${filename} langsung ke perangkat...`);
    } catch (err: any) {
      console.error(err);
      alert('Gagal membuat file: ' + (err?.message || 'Error tidak diketahui'));
    } finally {
      setIsExporting(false);
    }
  };

  // Android Sharesheet
  const handleShare = async () => {
    setIsExporting(true);
    try {
      const { blob, filename, mimeType } = await getBlobForFormat(activeFormat);
      const res = await shareFileOrDownload(blob, filename, mimeType);
      onSaveToHistory?.(activeFormat);
      if (res.method === 'sharesheet') {
        showToast('Menu berbagi Android dibuka');
      } else {
        showToast(`File diunduh: ${filename}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal membagikan file: ' + (err?.message || 'Error tidak diketahui'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Status */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Pemeriksaan Hasil Ekstraksi AI
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Data dapat disunting sebelum diunduh sebagai file final.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition active:scale-95"
              title="Edit dokumen menggunakan Chat AI"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
              <span>💬 Edit Lewat Chat AI</span>
            </button>

            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hidden xs:inline">
              Akurasi: {doc.confidenceScore}%
            </span>

            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              title="Konversi gambar lain"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mulai Ulang</span>
            </button>
          </div>
        </div>

        {/* Editable Title */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
            Judul Dokumen
          </label>
          <div className="relative">
            <input
              type="text"
              value={doc.documentTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-9"
              placeholder="Contoh: Faktur Pembelian CV Makmur"
            />
            <Edit2 className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Summary & Chat AI prompt banner */}
        <div className="space-y-2">
          {doc.summary && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">Ringkasan AI: </span>
              {doc.summary}
            </div>
          )}

          {/* Interactive Chat AI Trigger Banner */}
          <div
            onClick={() => setIsChatOpen(true)}
            className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50/60 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-blue-200/90 dark:border-blue-800/80 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-400 transition group shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Bot className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Mau merubah tabel, baris, atau angka lewat Chat AI?</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-semibold px-1.5 py-0.2 rounded-full">
                    Bisa!
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ketik instruksi seperti: "tambah baris baru", "tambah diskon 10%", atau "hitung ulang PPN".
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsChatOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 shadow-sm transition active:scale-95"
            >
              Buka Chat
            </button>
          </div>
        </div>
      </div>

      {/* Uncertainty Warnings if text was blurry */}
      {doc.uncertainties && doc.uncertainties.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/80 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Bagian yang Perlu Diperiksa Pengguna ({doc.uncertainties.length})</span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
            AI menemukan teks atau angka yang sedikit buram atau terpotong. Silakan periksa nilai berikut pada tabel di bawah:
          </p>
          <div className="space-y-1.5 pt-1">
            {doc.uncertainties.map((u, uIdx) => (
              <div
                key={uIdx}
                className="text-xs p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
              >
                <div>
                  <span className="font-semibold text-amber-900 dark:text-amber-200">{u.location}: </span>
                  <span className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-950 dark:text-amber-100">
                    "{u.observedText}"
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  {u.issue}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Format Switcher Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm flex items-center justify-between gap-1.5">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-2 hidden xs:inline">
          Ekspor:
        </span>
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setActiveFormat('excel')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 ${
              activeFormat === 'excel'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFormat('word')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 ${
              activeFormat === 'word'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Word (.docx)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFormat('pdf')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 ${
              activeFormat === 'pdf'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* TABLES EDITOR */}
      {doc.tables && doc.tables.length > 0 && (
        <div className="space-y-4">
          {doc.tables.map((table, tIdx) => (
            <div
              key={tIdx}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {table.title || `Tabel ${tIdx + 1}`} ({table.rows.length} Baris)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddRow(tIdx)}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah Baris</span>
                </button>
              </div>

              {/* Scrollable Spreadsheet Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2 w-8 text-center font-bold">#</th>
                      {table.headers.map((header, hIdx) => (
                        <th key={hIdx} className="p-2 font-bold min-w-[120px]">
                          <input
                            type="text"
                            value={header}
                            onChange={(e) => handleHeaderChange(tIdx, hIdx, e.target.value)}
                            className="w-full font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:outline-none"
                            title="Edit judul kolom"
                          />
                        </th>
                      ))}
                      <th className="p-2 w-10 text-center font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {table.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-2 text-center text-slate-400 font-mono text-[11px]">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-1 min-w-[120px]">
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => handleCellChange(tIdx, rIdx, cIdx, e.target.value)}
                              className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs"
                            />
                          </td>
                        ))}
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(tIdx, rIdx)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Subtotal & Total Display */}
              {table.total && (
                <div className="flex justify-end items-center gap-2 pt-1 text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-300">Total Akhir:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                    {table.total}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* KEY-VALUES METADATA EDITOR */}
      {doc.keyValues && doc.keyValues.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Data &amp; Keterangan Dokumen ({doc.keyValues.length})
            </h3>
            <button
              type="button"
              onClick={handleAddKeyValue}
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah Data</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {doc.keyValues.map((kv, kIdx) => (
              <div
                key={kIdx}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
              >
                <input
                  type="text"
                  value={kv.key}
                  onChange={(e) => handleKeyValueChange(kIdx, 'key', e.target.value)}
                  className="w-1/3 px-2 py-1 text-xs font-bold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                  placeholder="Label"
                />
                <input
                  type="text"
                  value={kv.value}
                  onChange={(e) => handleKeyValueChange(kIdx, 'value', e.target.value)}
                  className="w-2/3 px-2 py-1 text-xs font-mono rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  placeholder="Nilai"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveKeyValue(kIdx)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition"
                  title="Hapus data"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PARAGRAPHS / TEXT CONTENT EDITOR */}
      {doc.paragraphs && doc.paragraphs.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Teks &amp; Paragraf Dokumen
          </h3>
          <div className="space-y-2">
            {doc.paragraphs.map((p, pIdx) => (
              <textarea
                key={pIdx}
                rows={2}
                value={p.content}
                onChange={(e) => handleParagraphChange(pIdx, e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
              />
            ))}
          </div>
        </div>
      )}

      {/* PRIMARY ACTION BUTTONS (Touch Target >= 48dp) */}
      <div className="sticky bottom-4 z-30 pt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2.5 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md p-2.5 rounded-2xl border border-slate-700 shadow-2xl">
          {/* Main Download Button */}
          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleDownload(activeFormat)}
            className={`min-h-[48px] px-4 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50 ${
              activeFormat === 'excel'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/40'
                : activeFormat === 'word'
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/40'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/40'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>
              {isExporting
                ? 'Menyusun File...'
                : activeFormat === 'excel'
                ? 'Unduh Excel (.xlsx)'
                : activeFormat === 'word'
                ? 'Unduh Word (.docx)'
                : 'Unduh PDF'}
            </span>
          </button>

          {/* Android Sharesheet Button */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleShare}
            className="min-h-[48px] px-4 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan File</span>
          </button>
        </div>
      </div>

      {/* Interactive AI Chat Sheet for Live Document Modifications */}
      <DocumentChatSheet
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentDocument={doc}
        onDocumentUpdated={(newDoc) => {
          setDoc(newDoc);
          showToast('Dokumen berhasil diperbarui oleh Asisten AI');
        }}
      />
    </div>
  );
};
