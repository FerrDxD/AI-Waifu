'use client';

export interface AlertDetail {
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  confirmText: string;
  cancelText?: string;
  onResolve: (result: boolean) => void;
}

export function showCustomAlert(message: string, title = "Pesan dari Livia 💌"): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    window.dispatchEvent(
      new CustomEvent('temankos_alert', {
        detail: {
          title,
          message,
          type: 'alert',
          confirmText: '✨ Mengerti',
          onResolve: () => resolve(),
        } as AlertDetail,
      })
    );
  });
}

export function showCustomConfirm(
  message: string, 
  title = "Konfirmasi dari Livia ❓", 
  confirmText = "✅ Ya, Lanjutkan", 
  cancelText = "❌ Batal"
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    window.dispatchEvent(
      new CustomEvent('temankos_alert', {
        detail: {
          title,
          message,
          type: 'confirm',
          confirmText,
          cancelText,
          onResolve: (result: boolean) => resolve(result),
        } as AlertDetail,
      })
    );
  });
}
