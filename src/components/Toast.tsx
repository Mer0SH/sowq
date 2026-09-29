import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useApp } from '../context/useApp';

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-[200] flex flex-col gap-2 sm:bottom-8 sm:left-auto sm:right-6 sm:w-80"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          style={{ animation: 'toastIn 0.25s ease-out' }}
          className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium
            ${toast.type === 'success' ? 'bg-white border border-success/20 text-ink' : ''}
            ${toast.type === 'error' ? 'bg-white border border-danger/20 text-ink' : ''}
            ${toast.type === 'info' ? 'bg-white border border-border text-ink' : ''}
          `}
        >
          {toast.type === 'success' && <CheckCircle className="mt-0.5 shrink-0 text-success" size={18} />}
          {toast.type === 'error' && <XCircle className="mt-0.5 shrink-0 text-danger" size={18} />}
          {toast.type === 'info' && <Info className="mt-0.5 shrink-0 text-brand" size={18} />}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 text-muted hover:text-ink transition-colors"
            aria-label="إغلاق"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
