import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let bgClass = 'bg-slate-900/95 text-slate-100 border-slate-800';
          let Icon = Info;
          let iconColor = 'text-primary';

          if (t.type === 'success') {
            bgClass = 'bg-slate-900/95 text-slate-100 border-emerald-500/30 shadow-emerald-500/10';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
          } else if (t.type === 'error') {
            bgClass = 'bg-slate-900/95 text-slate-100 border-red-500/30 shadow-red-500/10';
            Icon = AlertCircle;
            iconColor = 'text-red-400';
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-up ${bgClass}`}
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
              <p className="flex-1 text-xs font-medium leading-relaxed">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
