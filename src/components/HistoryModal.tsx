import React, { useState, useEffect } from 'react';
import { X, Trash2, History, FileSpreadsheet, FileText, FileCode2, Clock, Shield } from 'lucide-react';
import { ConversionHistoryItem, ExtractedDocument } from '../types';
import {
  isHistoryEnabled,
  setHistoryEnabled,
  getConversionHistory,
  deleteHistoryItem,
  clearAllHistory,
} from '../services/storageService';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (doc: ExtractedDocument) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
}) => {
  const [enabled, setEnabled] = useState(isHistoryEnabled());
  const [items, setItems] = useState<ConversionHistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setEnabled(isHistoryEnabled());
      setItems(getConversionHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = () => {
    const newVal = !enabled;
    setEnabled(newVal);
    setHistoryEnabled(newVal);
    if (!newVal) {
      setItems([]);
    } else {
      setItems(getConversionHistory());
    }
  };

  const handleDeleteItem = (id: string) => {
    deleteHistoryItem(id);
    setItems(items.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat konversi?')) {
      clearAllHistory();
      setItems([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Riwayat Konversi
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Privacy Toggle Card */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-start gap-2.5 pr-2">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Simpan Riwayat di HP
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Tersimpan di browser lokal saja. Nonaktifkan kapan saja untuk privasi penuh.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={handleToggle}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none ${
                enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                  enabled ? 'translate-x-5.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* History List or Empty state */}
          {!enabled ? (
            <div className="text-center py-6 px-4 space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fitur riwayat saat ini dimatikan untuk menjaga privasi. Aktifkan sakelar di atas jika ingin menyimpan riwayat konversi lokal.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Belum Ada Riwayat
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Dokumen yang berhasil dikonversi akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Daftar Tersimpan ({items.length})
                </span>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold"
                >
                  Hapus Semua
                </button>
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 hover:border-blue-400 transition"
                >
                  <div
                    onClick={() => {
                      onSelectDocument(item.data);
                      onClose();
                    }}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      {item.format === 'excel' && (
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      {item.format === 'word' && (
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      {item.format === 'pdf' && (
                        <FileCode2 className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.title}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} • {item.imageCount} gambar
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        onSelectDocument(item.data);
                        onClose();
                      }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                    >
                      Buka
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition"
                      title="Hapus item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
