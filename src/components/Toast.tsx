import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastAction = {
  label: string;
  perform: () => void;
};

export type ToastItem = {
  id: number;
  message: string;
  action?: ToastAction;
};

const MAX_VISIBLE_TOASTS = 3;

/** App 级 toast 队列：showToast 返回 id，可凭 id 提前移除（如撤销 toast 在导入备份后立即失效）。 */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);
  const timersRef = useRef(new Map<number, number>());

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, options?: { action?: ToastAction; duration?: number }) => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;
      const item: ToastItem = { id, message, action: options?.action };
      setToasts((current) => [...current.slice(-(MAX_VISIBLE_TOASTS - 1)), item]);
      timersRef.current.set(id, window.setTimeout(() => dismissToast(id), options?.duration ?? 4000));
      return id;
    },
    [dismissToast]
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  return { toasts, showToast, dismissToast };
}

export function ToastHost({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" role="status">
          <span className="toast-message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action?.perform();
                onDismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
