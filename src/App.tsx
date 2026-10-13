import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Coffee,
  AlertCircle,
  RefreshCw,
  Zap,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileCode2,
} from 'lucide-react';
import { Header } from './components/Header';
import { ImagePicker } from './components/ImagePicker';
import { FormatSelector } from './components/FormatSelector';
import { ResultEditor } from './components/ResultEditor';
import { BagiKopiModal } from './components/BagiKopiModal';
import { AboutModal } from './components/AboutModal';
import { HistoryModal } from './components/HistoryModal';
import { HelpModal } from './components/HelpModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { ImageItem, TargetFormat, ExtractedDocument } from './types';
import { processImagesWithAI } from './services/geminiService';
import { saveConversionToHistory } from './services/storageService';
import { generateSampleInvoiceImage } from './utils/sampleDocuments';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark mode class to root HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Main conversion states
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<TargetFormat>('excel');
  const [preserveLayout, setPreserveLayout] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocument | null>(null);

  // Modals state
  const [showBagiKopi, setShowBagiKopi] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);

  // Load sample document for fast testing
  const handleLoadSample = () => {
    try {
      const sample = generateSampleInvoiceImage();
      setImages([sample]);
      setSelectedFormat('excel');
      setErrorMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Convert action
  const handleStartConversion = async () => {
    if (images.length === 0) {
      setErrorMessage('Silakan pilih minimal 1 foto atau screenshot dokumen terlebih dahulu.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProcessingStep('Mengirim gambar ke server backend...');

    try {
      setProcessingStep('AI Gemini sedang menganalisis teks, tabel, & struktur...');
      const resultDoc = await processImagesWithAI({
        images,
        targetFormat: selectedFormat,
        preserveLayout,
      });

      setExtractedDoc(resultDoc);
      // Auto save to history if enabled
      saveConversionToHistory(resultDoc, selectedFormat, images.length);
    } catch (error: any) {
      console.error('Conversion failed:', error);
      setErrorMessage(error?.message || 'Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleReset = () => {
    setExtractedDoc(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Android App Bar */}
      <Header
        onOpenBagiKopi={() => setShowBagiKopi(true)}
        onOpenHistory={() => setShowHistory(true)}
        onOpenHelp={() => setShowHelp(true)}
        onOpenAbout={() => setShowAbout(true)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 pb-24 space-y-6">
        {extractedDoc ? (
          /* RESULT INSPECTION & EDITING VIEW */
          <ResultEditor
            document={extractedDoc}
            initialFormat={selectedFormat}
            onReset={handleReset}
            onSaveToHistory={(fmt) => saveConversionToHistory(extractedDoc, fmt, images.length)}
          />
        ) : (
          /* INPUT & CONVERSION SETUP VIEW */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Hero / Greeting Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-5 sm:p-7 text-white shadow-xl shadow-blue-900/20">
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold text-blue-100 border border-white/20">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Kecerdasan Buatan Gemini Multimodal OCR</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                  Ubah Gambar &amp; Screenshot Menjadi Dokumen Siap Edit
                </h2>

                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed max-w-xl">
                  Ekstrak tabel akurat ke <strong>Excel (.xlsx)</strong>, dokumen terformat ke <strong>Word (.docx)</strong>, atau satukan menjadi <strong>PDF</strong> berkualitas tinggi.
                </p>

                {/* Quick Sample Document Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Coba Contoh Faktur Penjualan (1-Klik)</span>
                  </button>
                </div>
              </div>

              {/* Decorative shapes */}
              <div className="absolute -bottom-8 -right-8 w-44 h-44 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs space-y-2 flex items-start gap-3 animate-in shake duration-200">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold">Gagal Memproses Dokumen</h4>
                  <p className="leading-relaxed">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={handleStartConversion}
                    className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300 underline hover:no-underline pt-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Coba Lagi</span>
                  </button>
                </div>
              </div>
            )}

            {/* Section 1: Image Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Langkah 1: Pilih Sumber Gambar
                </label>
                {images.length > 0 && (
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {images.length} gambar siap diproses
                  </span>
                )}
              </div>

              <ImagePicker
                images={images}
                onImagesChange={setImages}
                onPreviewImage={(img) => setPreviewImage(img)}
              />
            </div>

            {/* Section 2: Format Selector */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Langkah 2: Format Hasil Konversi
              </label>

              <FormatSelector
                selectedFormat={selectedFormat}
                onSelectFormat={setSelectedFormat}
                preserveLayout={preserveLayout}
                onTogglePreserveLayout={setPreserveLayout}
              />
            </div>

            {/* Primary Action Button (Touch Target >= 48dp) */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isProcessing || images.length === 0}
                onClick={handleStartConversion}
                className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{processingStep || 'Sedang Memproses AI OCR...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>
                      Konversi dengan AI (
                      {selectedFormat === 'excel'
                        ? 'Excel .xlsx'
                        : selectedFormat === 'word'
                        ? 'Word .docx'
                        : 'PDF'}
                      )
                    </span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                Pemrosesan aman di server. Tidak ada data yang disimpan permanen.
              </p>
            </div>

            {/* Section Bagi Kopi jamhur Banner (Section 10) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    ☕ Bagi Kopi untuk Jamhur
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dukung pemeliharaan aplikasi via GoPay (08179015181).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBagiKopi(true)}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition active:scale-95 shadow-sm"
              >
                Bagi Kopi
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <BagiKopiModal
        isOpen={showBagiKopi}
        onClose={() => setShowBagiKopi(false)}
      />

      <AboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
        onOpenBagiKopi={() => setShowBagiKopi(true)}
      />

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectDocument={(doc) => setExtractedDoc(doc)}
      />

      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
