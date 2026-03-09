'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-glass)',
          borderRadius: '12px',
          fontSize: '14px',
          fontFamily: '"Fira Sans", sans-serif',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.08)',
        },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: '#FFFFFF',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#FFFFFF',
          },
        },
      }}
    />
  );
}
