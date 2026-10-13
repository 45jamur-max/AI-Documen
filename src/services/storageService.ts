import { ConversionHistoryItem, ExtractedDocument, TargetFormat } from '../types';

const STORAGE_KEY_HISTORY = 'ai_converter_history_v1';
const STORAGE_KEY_HISTORY_ENABLED = 'ai_converter_history_enabled';

export function isHistoryEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_HISTORY_ENABLED);
    return val === 'true'; // Default is FALSE to respect user privacy!
  } catch {
    return false;
  }
}

export function setHistoryEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY_ENABLED, enabled ? 'true' : 'false');
    if (!enabled) {
      clearAllHistory();
    }
  } catch (err) {
    console.error('Failed to update history setting', err);
  }
}

export function getConversionHistory(): ConversionHistoryItem[] {
  if (!isHistoryEnabled()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveConversionToHistory(doc: ExtractedDocument, format: TargetFormat, imageCount: number): ConversionHistoryItem | null {
  if (!isHistoryEnabled()) return null;

  try {
    const history = getConversionHistory();
    const newItem: ConversionHistoryItem = {
      id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      title: doc.documentTitle || 'Dokumen Konversi',
      format,
      imageCount,
      data: doc,
    };

    // Store up to 20 recent conversions
    const updated = [newItem, ...history].slice(0, 20);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
    return newItem;
  } catch (err) {
    console.warn('Could not save history to localStorage:', err);
    return null;
  }
}

export function deleteHistoryItem(id: string): void {
  try {
    const history = getConversionHistory();
    const filtered = history.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete history item', err);
  }
}

export function clearAllHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  } catch (err) {
    console.error('Failed to clear history', err);
  }
}
