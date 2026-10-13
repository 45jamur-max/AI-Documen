import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, FolderOpen, Trash2, ArrowUp, ArrowDown, Plus, Eye, AlertCircle } from 'lucide-react';
import { ImageItem } from '../types';

interface ImagePickerProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  onPreviewImage: (image: ImageItem) => void;
  maxFiles?: number;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  images,
  onImagesChange,
  onPreviewImage,
  maxFiles = 10,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File size formatter
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newItems: ImageItem[] = [];
    const maxAllowedSize = 20 * 1024 * 1024; // 20MB max per image

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Format check
      if (!file.type.startsWith('image/')) {
        alert(`File "${file.name}" bukan format gambar yang valid. Silakan unggah file JPG, PNG, WEBP, atau HEIC.`);
        continue;
      }

      // Size check
      if (file.size > maxAllowedSize) {
        alert(`Ukuran file "${file.name}" terlalu besar (${formatSize(file.size)}). Batas maksimal per gambar adalah 20MB.`);
        continue;
      }

      const reader = new FileReader();
      const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      reader.onload = (e) => {
        const resultUrl = e.target?.result as string;
        if (resultUrl) {
          const item: ImageItem = {
            id,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'image/jpeg',
            dataUrl: resultUrl,
            previewUrl: resultUrl,
          };

          onImagesChange([...images, ...newItems, item].slice(0, maxFiles));
        }
      };

      reader.readAsDataURL(file);
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onImagesChange(images.filter((img) => img.id !== id));
  };

  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    const copy = [...images];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    onImagesChange(copy);
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index >= images.length - 1) return;
    const copy = [...images];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    onImagesChange(copy);
  };

  const totalBytes = images.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="space-y-4">
      {/* Hidden file inputs for Camera, Gallery, and Files */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Main 3 Source Buttons (Camera, Gallery, Files) */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="min-h-[58px] p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm flex flex-col items-center justify-center gap-1.5 transition active:scale-95 text-slate-800 dark:text-slate-100 group"
        >
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">Foto Kamera</span>
        </button>

        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="min-h-[58px] p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm flex flex-col items-center justify-center gap-1.5 transition active:scale-95 text-slate-800 dark:text-slate-100 group"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ImageIcon className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">Galeri Android</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="min-h-[58px] p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-sm flex flex-col items-center justify-center gap-1.5 transition active:scale-95 text-slate-800 dark:text-slate-100 group"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FolderOpen className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">Pilih File</span>
        </button>
      </div>

      {/* Selected Images Preview Container */}
      {images.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm space-y-3">
          {/* Header Summary */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {images.length} Gambar Dipilih
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                ({formatSize(totalBytes)})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {images.length > 1 && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Digabung jadi 1 dokumen
                </span>
              )}
              <button
                type="button"
                onClick={() => onImagesChange([])}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                Hapus Semua
              </button>
            </div>
          </div>

          {/* List of Image Cards */}
          <div className="space-y-2">
            {images.map((img, index) => (
              <div
                key={img.id}
                onClick={() => onPreviewImage(img)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition group"
              >
                {/* Index badge */}
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </div>

                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 relative">
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Filename & size */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {img.name}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {formatSize(img.size)} • {img.mimeType.replace('image/', '').toUpperCase()}
                  </p>
                </div>

                {/* Action controls (Move Up, Move Down, Delete) */}
                <div className="flex items-center gap-1 shrink-0">
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => handleMoveUp(index, e)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                        title="Geser ke atas"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === images.length - 1}
                        onClick={(e) => handleMoveDown(index, e)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                        title="Geser ke bawah"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(img.id, e)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition"
                    title="Hapus gambar ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add more button */}
          {images.length < maxFiles && (
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Gambar atau Halaman Lain ({images.length}/{maxFiles})</span>
            </button>
          )}
        </div>
      ) : (
        /* Empty State Guidance */
        <div className="bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 p-4 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Belum Ada Gambar yang Dipilih
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm mx-auto">
              Ketuk salah satu tombol di atas untuk mengambil foto dokumen, memilih screenshot dari galeri, atau memilih berkas.
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-300 font-medium pt-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Mendukung multi-halaman &amp; screenshot panjang</span>
          </div>
        </div>
      )}
    </div>
  );
};
