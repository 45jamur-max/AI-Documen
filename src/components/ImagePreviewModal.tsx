import React from 'react';
import { X } from 'lucide-react';
import { ImageItem } from '../types';

interface ImagePreviewModalProps {
  image: ImageItem | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-3 bg-slate-950/80 text-white flex items-center justify-between border-b border-slate-800">
          <p className="text-xs font-semibold truncate pr-4">{image.name}</p>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-auto p-2 flex items-center justify-center bg-black/40">
          <img
            src={image.previewUrl}
            alt={image.name}
            className="max-h-[75vh] w-auto object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
