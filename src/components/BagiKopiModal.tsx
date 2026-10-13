import React, { useState } from 'react';
import { Coffee, Copy, Check, ExternalLink, X, Heart, ShieldCheck, AlertCircle } from 'lucide-react';

interface BagiKopiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BagiKopiModal: React.FC<BagiKopiModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  if (!isOpen) return null;

  const GOPAY_NUMBER = '08179015181';
  const RECIPIENT_NAME = 'Jamhur';

  const handleCopy = () => {
    navigator.clipboard.writeText(GOPAY_NUMBER).then(() => {
      setCopied(true);
      setToastText('Nomor GoPay berhasil disalin ke clipboard');
      setTimeout(() => {
        setCopied(false);
        setToastText(null);
      }, 3000);
    }).catch(() => {
      // Fallback
      setToastText('Nomor: ' + GOPAY_NUMBER);
    });
  };

  const handleOpenGoPay = () => {
    // Attempt standard Gojek/GoPay deep link or open instructions
    const gopayScheme = `gopay://`;
    window.location.href = gopayScheme;
    setTimeout(() => {
      setToastText('Membuka aplikasi GoPay... Pastikan periksa nama Jamhur.');
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="relative bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition active:scale-95"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner mb-3">
            <Coffee className="w-8 h-8 text-white drop-shadow" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold leading-tight">
            Traktir Jamhur Secangkir Kopi ☕
          </h2>
          <p className="text-xs text-amber-100 mt-1">
            Dukungan Pengembang AI Converter Android
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Toast Notification */}
          {toastText && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{toastText}</span>
            </div>
          )}

          {/* Description */}
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-center">
            Jika AI Converter ini membantu pekerjaanmu, kamu bisa mendukung pengembang dengan berbagi kopi. Dukunganmu membantu pengembangan fitur dan perbaikan aplikasi.
          </p>

          {/* Payment Card Detail */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Metode Pembayaran</span>
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                GoPay
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nama Penerima</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {RECIPIENT_NAME}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">
                Nomor GoPay
              </span>
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5">
                <span className="text-base sm:text-lg font-mono font-bold tracking-wider text-slate-900 dark:text-white">
                  {GOPAY_NUMBER}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition active:scale-95 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 dark:text-amber-200'
                  }`}
                  title="Salin nomor GoPay"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin Nomor'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Security & Verification Reminder */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Peringatan Keamanan:</strong> Sebelum menekan konfirmasi transfer pada aplikasi GoPay Anda, pastikan nama penerima yang muncul benar tertulis <strong>Jamhur</strong>.
            </p>
          </div>

          {/* Transfer Guide */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Cara Berbagi Kopi:</p>
            <ol className="list-decimal list-inside space-y-0.5 pl-1">
              <li>Salin nomor GoPay di atas.</li>
              <li>Buka aplikasi GoPay atau Gojek di HP Anda.</li>
              <li>Pilih menu <strong>Transfer / Kirim ke Teman</strong>.</li>
              <li>Tempel nomor HP dan pastikan penerimanya adalah <strong>Jamhur</strong>.</li>
            </ol>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 transition active:scale-95"
          >
            <Copy className="w-4 h-4" />
            <span>Salin Nomor GoPay</span>
          </button>

          <button
            type="button"
            onClick={handleOpenGoPay}
            className="min-h-[44px] py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Buka GoPay</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition active:scale-95"
          >
            Kembali ke Aplikasi
          </button>
        </div>
      </div>
    </div>
  );
};
