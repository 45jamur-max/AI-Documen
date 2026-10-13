import React from 'react';
import { X, Smartphone, ShieldCheck, Code2, Terminal, Info, Heart, CheckCircle2 } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBagiKopi: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  onOpenBagiKopi,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
              AI
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Tentang AI Converter Android
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Informasi Platform, Privasi &amp; Panduan APK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-600 dark:text-slate-300">
          {/* Platform Status Transparency */}
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-bold">
              <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Status Platform Saat Ini</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Aplikasi ini berjalan sebagai <strong>Aplikasi Web Responsif Khusus Android (PWA)</strong>. Anda dapat langsung memasangnya ke layar utama (Home Screen) HP Android Anda tanpa perlu mendownload dari Google Play Store.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mendukung Android Camera, Galeri, dan Android Sharesheet</span>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Keamanan Data &amp; Privasi Dokumen</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              <li>API Key Gemini dikelola dengan aman di server backend, tidak pernah bocor ke peramban.</li>
              <li>Gambar yang diunggah hanya diproses sementara untuk ekstraksi OCR dan <strong>tidak disimpan secara permanen</strong>.</li>
              <li>Data tabel dan dokumen hasil konversi berada pada kendali penuh Anda di perangkat.</li>
            </ul>
          </div>

          {/* How to Build Native APK (Capacitor Guide) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
              <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Panduan Mengemas Menjadi APK Native (Capacitor)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Jika Anda ingin mengkompilasi aplikasi ini menjadi file berkas APK instalasi langsung untuk Android Studio, jalankan perintah berikut:
            </p>
            <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto leading-relaxed">
{`# 1. Install Capacitor CLI & platform Android
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Inisialisasi proyek Capacitor
npx cap init "AI Converter" "com.aiconverter.app"

# 3. Build aset web
npm run build

# 4. Tambahkan folder native Android
npx cap add android

# 5. Buka proyek di Android Studio untuk Build APK
npx cap open android`}
            </pre>
          </div>

          {/* Bagi Kopi Promo */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                Suka dengan AI Converter?
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Dukung pengembangan aplikasi dengan berbagi kopi via GoPay Jamhur.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenBagiKopi();
              }}
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition active:scale-95"
            >
              ☕ Bagi Kopi
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
