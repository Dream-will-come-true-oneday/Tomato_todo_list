import { getDesktopBridge, type SaveBackupResult } from '../desktopBridge';
import { toDateKey } from '../domain/todoFilters';

export function downloadTextFile(contents: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type BrowserSaveHandle = {
  createWritable: () => Promise<{
    write: (contents: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

export type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<BrowserSaveHandle>;
};

export function backupFileName(label: '完整备份' | '导入前备份', date = new Date()) {
  const datePart = toDateKey(date);
  const timePart = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => part.toString().padStart(2, '0'))
    .join('');
  return `番茄时钟与待办-${label}-${datePart}-${timePart}.json`;
}

export async function saveBackupFile(
  contents: string,
  fileName: string,
  desktopBridge: ReturnType<typeof getDesktopBridge>
): Promise<SaveBackupResult> {
  if (desktopBridge) return desktopBridge.saveFullBackup(contents, fileName);

  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: fileName,
        types: [{ description: 'JSON 数据备份', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();
      return { status: 'saved', filePath: fileName };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return { status: 'cancelled' };
      return { status: 'error', message: error instanceof Error ? error.message : '写入备份文件失败' };
    }
  }

  downloadTextFile(contents, fileName);
  return { status: 'saved', filePath: fileName };
}
