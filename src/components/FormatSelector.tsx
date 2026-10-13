import React from 'react';
import { FileSpreadsheet, FileText, FileCode2, CheckCircle2 } from 'lucide-react';
import { TargetFormat } from '../types';

interface FormatSelectorProps {
  selectedFormat: TargetFormat;
  onSelectFormat: (format: TargetFormat) => void;
  preserveLayout: boolean;
  onTogglePreserveLayout: (val: boolean) => void;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  selectedFormat,
  onSelectFormat,
  preserveLayout,
  onTogglePreserveLayout,
}) => {
  const formats: Array<{
    id: TargetFormat;
    name: string;
    ext: string;
    badge: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    activeBorder: string;
    activeBg: string;
  }> = [
    {
      id: 'excel',
      name: 'Microsoft Excel',
      ext: '.xlsx',
      badge: 'Terbaik untuk Tabel & Angka',
      desc: 'Memisahkan kolom & baris, mengenali subtotal, total, format rupiah, dan angka berkode.',
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      color: 'text-emerald-600',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
      activeBg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
    },
    {
      id: 'word',
      name: 'Microsoft Word',
      ext: '.docx',
      badge: 'Terbaik untuk Surat & Formulir',
      desc: 'Mengenali judul, subjudul, paragraf, daftar berpoin, dan tabel yang mudah disunting.',
      icon: <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      color: 'text-blue-600',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      activeBg: 'bg-blue-50/70 dark:bg-blue-950/40',
    },
    {
      id: 'pdf',
      name: 'Dokumen PDF',
      ext: '.pdf',
      badge: 'Terbaik untuk Cetak & Arsip',
      desc: 'Menggabungkan hasil ekstraksi menjadi PDF terformat dengan teks yang dapat disalin.',
      icon: <FileCode2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      color: 'text-rose-600',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
      activeBg: 'bg-rose-50/70 dark:bg-rose-950/40',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Format Keluaran Dokumen
        </label>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Bisa diubah lagi setelah pratinjau
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {formats.map((fmt) => {
          const isSelected = selectedFormat === fmt.id;
          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => onSelectFormat(fmt.id)}
              className={`min-h-[72px] p-3 rounded-2xl border text-left transition-all active:scale-98 relative flex flex-col justify-between ${
                isSelected
                  ? `${fmt.activeBorder} ${fmt.activeBg} border-2`
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-1 w-full">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-xs">
                    {fmt.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {fmt.name}
                    </h4>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                      {fmt.ext}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                {fmt.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Preserve layout checkbox toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="pr-3">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Pertahankan Tata Letak Asli Dokumen
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            AI akan menyusun urutan teks &amp; tabel semirip mungkin dengan foto sumber.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={preserveLayout}
          onClick={() => onTogglePreserveLayout(!preserveLayout)}
          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none ${
            preserveLayout ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
              preserveLayout ? 'translate-x-5.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
