import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  X,
  Bot,
  User,
  ChevronDown,
} from 'lucide-react';
import { ExtractedDocument } from '../types';
import { ChatMessage, modifyDocumentWithChat } from '../services/geminiService';

interface DocumentChatSheetProps {
  currentDocument: ExtractedDocument;
  onDocumentUpdated: (newDoc: ExtractedDocument) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentChatSheet: React.FC<DocumentChatSheetProps> = ({
  currentDocument,
  onDocumentUpdated,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Halo! Saya asisten AI untuk menyunting dokumen ini. Anda bisa meminta saya untuk menambah baris, menghitung ulang total/pajak/diskon, mengubah nama kolom, atau merapikan isi tabel.',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previousDocHistory, setPreviousDocHistory] = useState<ExtractedDocument[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick suggestions
  const quickSuggestions = [
    'Hitung ulang total & tambahkan PPN 11%',
    'Tambahkan baris: Map Folio, 10 Pcs, Rp 5.000',
    'Tambahkan kolom Diskon 5%',
    'Terjemahkan nama barang ke Bahasa Inggris',
    'Rapikan format angka & hilangkan spasi ganda',
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: prompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // Save history for undo
    setPreviousDocHistory((prev) => [...prev, currentDocument]);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.text,
      }));

      const { assistantReply, updatedDocument, changes } = await modifyDocumentWithChat(
        currentDocument,
        prompt,
        historyPayload
      );

      const aiMsg: ChatMessage = {
        id: 'ai_' + Date.now(),
        sender: 'assistant',
        text: assistantReply,
        timestamp: Date.now(),
        changes,
      };

      setMessages((prev) => [...prev, aiMsg]);
      onDocumentUpdated(updatedDocument);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'err_' + Date.now(),
        sender: 'assistant',
        text: 'Maaf, terjadi kendala: ' + (err?.message || 'Gagal memproses perubahan.'),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (previousDocHistory.length === 0) return;
    const previous = previousDocHistory[previousDocHistory.length - 1];
    setPreviousDocHistory((prev) => prev.slice(0, -1));
    onDocumentUpdated(previous);

    const undoMsg: ChatMessage = {
      id: 'undo_' + Date.now(),
      sender: 'assistant',
      text: 'Perubahan terakhir telah dibatalkan. Dokumen dikembalikan ke versi sebelumnya.',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, undoMsg]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-[88vh] sm:h-[650px] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight flex items-center gap-1.5">
                <span>Asisten Chat AI Dokumen</span>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-1.5 py-0.2 rounded-full">
                  LIVE
                </span>
              </h3>
              <p className="text-[11px] text-blue-100">
                Ubah tabel, tambah item, &amp; perbarui total lewat chat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {previousDocHistory.length > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white transition active:scale-95"
                title="Batalkan perubahan terakhir"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden xs:inline">Undo</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
              aria-label="Tutup Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="p-2.5 bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 overflow-x-auto flex gap-1.5 shrink-0 no-scrollbar">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 pl-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Saran:</span>
          </div>
          {quickSuggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(sug)}
              className="text-[11px] font-medium whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 hover:border-blue-400 text-slate-700 dark:text-slate-200 transition active:scale-95 shrink-0 disabled:opacity-50"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/60">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed space-y-1.5 shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Badges for changes made */}
                {msg.changes && msg.changes.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Perubahan Berhasil Diterapkan:</span>
                    </span>
                    <ul className="space-y-0.5 pl-1">
                      {msg.changes.map((c, i) => (
                        <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  className={`text-[9px] ${
                    msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-2.5 items-center text-xs text-slate-500 dark:text-slate-400">
              <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-100" />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-200" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  AI sedang menyunting dokumen Anda...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Live Synchronized Status Bar */}
        <div className="px-3.5 py-2 bg-emerald-50/90 dark:bg-emerald-950/50 border-t border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold truncate">
              {currentDocument.documentTitle || 'Dokumen'}
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 shrink-0 font-medium">
              ({currentDocument.tables?.[0]?.rows?.length || 0} baris
              {currentDocument.tables?.[0]?.total ? ` • Total: ${currentDocument.tables[0].total}` : ''})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 active:scale-95 transition shadow-xs"
            title="Tutup chat dan periksa tabel langsung"
          >
            Lihat Tabel ↗
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              disabled={isLoading}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik instruksi (cth: ubah diskon jadi 10%)..."
              className="flex-1 min-h-[46px] px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="min-h-[46px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Kirim</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
