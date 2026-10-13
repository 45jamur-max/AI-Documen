import React from 'react';
import { Coffee, History, HelpCircle, Info, Download, Moon, Sun } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  onOpenBagiKopi: () => void;
  onOpenHistory: () => void;
  onOpenHelp: () => void;
  onOpenAbout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBagiKopi,
  onOpenHistory,
  onOpenHelp,
  onOpenAbout,
  darkMode,
  onToggleDarkMode,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and App Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold text-lg">
            AI
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base sm:text-lg leading-tight text-slate-900 dark:text-white">
                AI Converter
              </h1>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Android
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none truncate max-w-[170px] sm:max-w-none">
              Gambar ke Excel, Word &amp; PDF
            </p>
          </div>
        </div>

        {/* Action icons & buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* PWA Install Button (if browser supports install prompt) */}
          {isInstallable && !isInstalled && (
            <button
              onClick={install}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95"
              title="Pasang aplikasi di layar utama Android"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Pasang</span>
            </button>
          )}

          {/* Bagi Kopi Header Button */}
          <button
            onClick={onOpenBagiKopi}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition active:scale-95"
            title="Traktir Bagi Kopi GoPay Jamhur"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Bagi Kopi</span>
          </button>

          {/* History */}
          <button
            onClick={onOpenHistory}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition active:scale-95"
            title="Riwayat Konversi"
            aria-label="Riwayat Konversi"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Help */}
          <button
            onClick={onOpenHelp}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition active:scale-95"
            title="Bantuan & Tips OCR"
            aria-label="Bantuan"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* About */}
          <button
            onClick={onOpenAbout}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition active:scale-95"
            title="Tentang Aplikasi & Info APK"
            aria-label="Tentang Aplikasi"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition active:scale-95"
            title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            aria-label="Ganti Tema"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
