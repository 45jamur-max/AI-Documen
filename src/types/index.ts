export type TargetFormat = 'excel' | 'word' | 'pdf';

export interface ImageItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  dataUrl: string; // base64 data url
  previewUrl: string;
}

export interface TableData {
  title: string;
  headers: string[];
  rows: string[][];
  subtotals?: Array<{ label: string; value: string }>;
  total?: string;
}

export interface KeyValueItem {
  key: string;
  value: string;
  isFinancialOrCode?: boolean;
  needsReview?: boolean;
  reviewNote?: string;
}

export interface ParagraphItem {
  type: 'heading1' | 'heading2' | 'paragraph' | 'bullet' | 'callout';
  content: string;
  needsReview?: boolean;
}

export interface UncertaintyItem {
  location: string;
  observedText: string;
  issue: string;
}

export interface QrBarcodeItem {
  type: 'qr_code' | 'barcode' | 'e_faktur' | 'resi' | 'other';
  rawText: string;
  label?: string;
  isUrl?: boolean;
}

export interface ExtractedDocument {
  documentTitle: string;
  documentType: 'table' | 'receipt' | 'document' | 'invoice' | 'mixed';
  summary: string;
  confidenceScore: number;
  detectedLanguage: string;
  tables: TableData[];
  keyValues: KeyValueItem[];
  paragraphs: ParagraphItem[];
  uncertainties: UncertaintyItem[];
  qrBarcodes?: QrBarcodeItem[];
}

export interface ConversionHistoryItem {
  id: string;
  timestamp: number;
  title: string;
  format: TargetFormat;
  imageCount: number;
  data: ExtractedDocument;
}

export interface PdfOptions {
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  includeImages: boolean;
}
