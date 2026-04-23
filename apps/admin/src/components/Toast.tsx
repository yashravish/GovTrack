import { useEffect } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export function Toast({
  kind = 'info',
  message,
  onClose,
  durationMs = 4000,
}: {
  kind?: ToastKind;
  message: string;
  onClose: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [onClose, durationMs]);

  return (
    <div
      className={`toast toast--${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
    >
      {message}
    </div>
  );
}
