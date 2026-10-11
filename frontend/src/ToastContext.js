import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const COLORS = {
  error: '#c0392b',
  success: '#27ae60',
  info: '#2980b9'
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback(id => {
    setToasts(current => current.filter(t => t.id !== id));
  }, []);

  const show = useCallback((type, message) => {
    const id = nextId.current++;
    setToasts(current => [...current.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const toast = useMemo(() => ({
    error: message => show('error', message),
    success: message => show('success', message),
    info: message => show('info', message)
  }), [show]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(92vw, 420px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 5000,
          pointerEvents: 'none'
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            onClick={() => dismiss(t.id)}
            style={{
              background: COLORS[t.type],
              color: 'white',
              padding: '12px 16px',
              borderRadius: 10,
              boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
              fontSize: 14,
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
